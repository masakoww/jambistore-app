import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { sendStaffLog, StaffLogTemplates, createAuditLog } from "@/lib/staffLogger";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { reason, closeTicket } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { ok: false, error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Get order from Firestore
    const orderRef = db.collection("orders").doc(id);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();

    // Update order status to REJECTED
    await orderRef.update({
      status: "REJECTED",
      rejectionReason: reason.trim(),
      rejectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create audit log
    await createAuditLog(id, 'order_rejected', 'admin', {
      reason: reason.trim(),
      ticketClosed: closeTicket || false
    });

    // Send staff log notification
    await sendStaffLog(
      StaffLogTemplates.orderRejected(id, reason.trim(), 'Admin'),
      {
        orderId: id,
        action: 'Order Rejected',
        adminName: 'Admin',
        details: `Reason: ${reason.trim()}`,
        color: 'error'
      }
    );

    console.log(`❌ Order ${id} rejected:`, reason);

    // Close Discord ticket if requested
    if (closeTicket && orderData?.ticket_id) {
      const botWebhookUrl = process.env.BOT_WEBHOOK_URL;
      if (botWebhookUrl) {
        try {
          const closeResponse = await fetch(`${botWebhookUrl}/close-ticket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: id,
              ticketId: orderData.ticket_id,
              reason: `Order rejected: ${reason.trim()}`,
              status: 'REJECTED'
            }),
            signal: AbortSignal.timeout(5000)
          });

          if (closeResponse.ok) {
            console.log(`✅ Discord ticket ${orderData.ticket_id} closed for rejected order ${id}`);
          } else {
            console.error('❌ Failed to close Discord ticket:', await closeResponse.text());
          }
        } catch (webhookError) {
          console.error('❌ Error calling bot webhook to close ticket:', webhookError);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Order rejected successfully",
      orderId: id,
      ticketClosed: closeTicket && orderData?.ticket_id ? true : false,
    });
  } catch (error: any) {
    console.error("Error rejecting order:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to reject order" },
      { status: 500 }
    );
  }
}
