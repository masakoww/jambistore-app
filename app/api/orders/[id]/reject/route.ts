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
    const { reason } = body;

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
      reason: reason.trim()
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


    // You can implement this based on your notification system

    return NextResponse.json({
      ok: true,
      message: "Order rejected successfully",
      orderId: id,
    });
  } catch (error: any) {
    console.error("Error rejecting order:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to reject order" },
      { status: 500 }
    );
  }
}
