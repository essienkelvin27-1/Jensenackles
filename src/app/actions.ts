"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth";
import { sendNotification } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { eventSchema, profileSchema, supportSchema } from "@/lib/validation";

const emailSchema = z.string().email();

export async function registerAction(formData: FormData) {
  const parsed = z.object({
    full_name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: z.string().min(8).max(128),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/register?error=Check+your+details+and+use+a+password+of+at+least+8+characters.");

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });
  if (error) redirect("/register?error=Unable+to+register.+Check+your+details+or+try+again.");
  redirect("/login?message=Check+your+email+to+verify+your+account.");
}

export async function loginAction(formData: FormData) {
  const parsed = z.object({ email: emailSchema, password: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?error=Enter+a+valid+email+and+password.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=Sign-in+failed.+Check+your+credentials+and+verify+your+email.");

  const { data: profile } = await supabase.from("profiles").select("role").single();
  if (profile?.role === "admin") redirect("/admin");
  redirect("/account");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPasswordAction(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) redirect("/forgot-password?error=Enter+a+valid+email+address.");

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error) redirect("/forgot-password?error=Could+not+send+the+reset+email.+Try+again.");
  redirect("/forgot-password?message=If+that+account+exists,+a+reset+link+has+been+sent.");
}

export async function resetPasswordAction(formData: FormData) {
  const password = z.string().min(8).max(128).safeParse(formData.get("password"));
  if (!password.success) redirect("/reset-password?error=Password+must+be+at+least+8+characters.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) redirect("/reset-password?error=Could+not+update+password.+Request+a+new+reset+link.");
  redirect("/account?message=Password+updated.");
}

export async function updateProfileAction(formData: FormData) {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/account?error=Enter+a+valid+name+and+phone+number.");
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({
    full_name: parsed.data.full_name,
    phone: parsed.data.phone || null,
  }).eq("id", user.id);
  if (error) redirect("/account?error=Could+not+save+profile.");
  revalidatePath("/account");
  redirect("/account?message=Profile+updated.");
}

export async function updateCustomerAction(formData: FormData) {
  const parsed = z.object({
    customer_id: z.string().uuid(),
    full_name: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(30).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/customers?error=Enter+a+valid+customer+name+and+phone.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("profiles").update({
    full_name: parsed.data.full_name,
    phone: parsed.data.phone || null,
  }).eq("id", parsed.data.customer_id).eq("role", "customer");
  if (error) redirect(`/admin/customers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/customers");
  redirect("/admin/customers?message=Customer+details+updated.");
}

export async function createOrderAction(formData: FormData) {
  const parsed = z.object({
    event_id: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(10),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/?error=Choose+a+valid+ticket+quantity.");
  const { supabase } = await requireUser();
  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_event_id: parsed.data.event_id,
    p_quantity: parsed.data.quantity,
  });
  if (error || !orderId) redirect(`/?error=${encodeURIComponent(error?.message ?? "Could not create order.")}`);
  redirect(`/orders/${orderId}`);
}

export async function createSupportTicketAction(formData: FormData) {
  const parsed = supportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/support?error=Add+a+subject+and+a+message+of+at+least+10+characters.");
  const { supabase, user } = await requireUser();
  const { data: ticket, error } = await supabase.from("support_tickets")
    .insert({ customer_id: user.id, subject: parsed.data.subject })
    .select("id")
    .single();
  if (error || !ticket) redirect("/support?error=Could+not+create+support+request.");
  const { error: messageError } = await supabase.from("support_messages").insert({
    support_ticket_id: ticket.id,
    sender_id: user.id,
    message: parsed.data.message,
  });
  if (messageError) redirect("/support?error=Support+request+was+created,+but+the+message+could+not+be+sent.");
  redirect(`/support/${ticket.id}`);
}

export async function replySupportAction(formData: FormData) {
  const parsed = z.object({
    ticket_id: z.string().uuid(),
    message: z.string().trim().min(1).max(4000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/support?error=Enter+a+message.");
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("support_messages").insert({
    support_ticket_id: parsed.data.ticket_id,
    sender_id: user.id,
    message: parsed.data.message,
  });
  if (error) redirect(`/support/${parsed.data.ticket_id}?error=Could+not+send+reply.`);
  const { data: ticket } = await supabase.from("support_tickets")
    .select("customer_id,subject")
    .eq("id", parsed.data.ticket_id)
    .single();
  let emailWarning = "";
  if (ticket && ticket.customer_id !== user.id) {
    const { data: customer } = await supabase.from("profiles").select("email").eq("id", ticket.customer_id).single();
    if (customer?.email) {
      const notification = await sendNotification(customer.email, `Support reply: ${ticket.subject}`, parsed.data.message);
      emailWarning = notification.warning ?? "";
    }
  }
  revalidatePath(`/support/${parsed.data.ticket_id}`);
  const replyStatus = emailWarning ? `Reply+saved.+${encodeURIComponent(emailWarning)}` : "Reply+sent.";
  redirect(`/support/${parsed.data.ticket_id}?message=${replyStatus}`);
}

export async function createEventAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const price = z.coerce.number().positive().safeParse(raw.price_dollars);
  const capacity = z.coerce.number().int().positive().safeParse(raw.capacity);
  const startsAt = z.string().min(1).safeParse(raw.starts_at);
  const startsAtDate = startsAt.success ? new Date(startsAt.data) : null;
  if (!price.success || !capacity.success || !startsAtDate || Number.isNaN(startsAtDate.getTime()) || startsAtDate <= new Date()) {
    redirect("/admin/events?error=Enter+a+valid+future+date,+price,+and+ticket+capacity.");
  }
  const parsed = eventSchema.safeParse({
    ...raw,
    starts_at: startsAtDate.toISOString(),
    price_cents: Math.round(price.data * 100),
    capacity: capacity.data,
    published: raw.published === "on",
  });
  if (!parsed.success) redirect("/admin/events?error=Check+the+event+details.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("events").insert({
    ...parsed.data,
    image_url: parsed.data.image_url || null,
  });
  if (error) redirect(`/admin/events?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
  redirect("/admin/events?message=Event+created.");
}

export async function setEventPublishedAction(formData: FormData) {
  const parsed = z.object({ event_id: z.string().uuid(), published: z.enum(["true", "false"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/events?error=Invalid+event+update.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("events")
    .update({ published: parsed.data.published === "true" })
    .eq("id", parsed.data.event_id);
  if (error) redirect(`/admin/events?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
  revalidatePath("/admin/events");
  redirect("/admin/events?message=Event+updated.");
}

export async function reviewOrderAction(formData: FormData) {
  const parsed = z.object({
    order_id: z.string().uuid(),
    approved: z.enum(["true", "false"]),
    note: z.string().max(500).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/orders?error=Invalid+payment+review.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("approve_order", {
    p_order_id: parsed.data.order_id,
    p_approved: parsed.data.approved === "true",
    p_note: parsed.data.note || null,
  });
  if (error) redirect(`/admin/orders?error=${encodeURIComponent(error.message)}`);
  const { data: order } = await supabase.from("orders")
    .select("customer_id,profiles(email),events(name)")
    .eq("id", parsed.data.order_id)
    .single();
  const customer = Array.isArray(order?.profiles) ? order.profiles[0] : order?.profiles;
  const event = Array.isArray(order?.events) ? order.events[0] : order?.events;
  let emailWarning = "";
  if (customer?.email) {
    const approved = parsed.data.approved === "true";
    const notification = await sendNotification(
      customer.email,
      approved ? "Your TourTickets order is confirmed" : "Update to your TourTickets payment",
      approved
        ? `Your payment for ${event?.name ?? "your event"} has been verified. Your digital tickets are ready in your account.`
        : `Your payment for ${event?.name ?? "your event"} was not approved. ${parsed.data.note ?? "Please contact support."}`,
    );
    emailWarning = notification.warning ?? "";
  }
  revalidatePath("/admin/orders");
  revalidatePath("/account");
  const reviewStatus = emailWarning
    ? `Payment+review+saved.+${encodeURIComponent(emailWarning)}`
    : "Payment+review+saved.";
  redirect(`/admin/orders?message=${reviewStatus}`);
}

export async function updateSupportStatusAction(formData: FormData) {
  const parsed = z.object({
    ticket_id: z.string().uuid(),
    status: z.enum(["open", "answered", "closed"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/support?error=Invalid+support+status.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("support_tickets")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.ticket_id);
  if (error) redirect(`/admin/support?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/support");
  redirect("/admin/support?message=Support+status+updated.");
}

export async function signedEvidenceUrlAction(path: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.storage
    .from("payment-evidence")
    .createSignedUrl(path, 60 * 5);
  if (error) throw new Error(`Could not access payment evidence: ${error.message}`);
  return data.signedUrl;
}
