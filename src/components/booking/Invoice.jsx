import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, ArrowLeft } from "lucide-react";

// TODO: Replace with your actual logo source
const Logo = () => (
  <img
    src="/ht.png" // Place your logo in /public or use SVG inline
    alt="HangOut Tourist Logo"
    style={{ height: 48 }}
    className="mb-2"
  />
);

const Invoice = ({ invoice, onClose }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleDownload = () => {
    handlePrint(); // Print can be saved as PDF by user
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!invoice) return null;

  return (
    <div className="w-full bg-white font-sans">
      {/* Print/Download Controls */}
      <div className="flex gap-2 justify-between items-center p-4 bg-background border-b no-print">
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isPrinting}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={isPrinting}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* INVOICE HEADER */}
      <div className="max-w-4xl mx-auto pt-10 px-8 print:p-0 print:max-w-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Logo />
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold tracking-tight mb-1">
              Hotel Booking Summary
            </h1>
            <p className="text-sm text-muted-foreground">
              Please present either an electronic or paper copy of your booking confirmation upon check-in.
            </p>
          </div>
        </div>

        {/* Main Info Panels */}
        <div className="flex flex-col md:flex-row mt-8 mb-4 gap-4 print:flex-row">
          {/* Booking Info Left Side */}
          <div className="flex-1 bg-slate-50 rounded p-4 border">
            <h3 className="font-semibold mb-3">Booking Information:</h3>
            <div className="grid grid-cols-2 gap-0">
              <div className="col-span-2 text-sm pb-2">
                <strong>Booking Reference:</strong> <span className="font-mono select-all">{invoice.bookingNumber}</span>
              </div>
              <div><strong>Booking Date:</strong><br />{formatDate(invoice.bookingDate)}</div>
              <div><strong>Booking Time:</strong><br />{formatTime(invoice.bookingDate)}</div>
              <div><strong>Hotel confirmation no:</strong><br />{invoice.hotelConfirmationNo || invoice.bookingNumber}</div>
              <div><strong>Supplier confirmation number:</strong><br />{invoice.supplierConfirmationNo || invoice.bookingNumber}</div>
              <div className="col-span-2"><strong>Hotel Name:</strong> <br /><span className="font-medium">{invoice.property.name}</span></div>
              <div className="col-span-2"><strong>Hotel Address:</strong><br />{invoice.property.details}</div>
            </div>
          </div>
          {/* Stay Info Right Side */}
          <div className="w-full md:w-96 bg-zinc-100 rounded p-4 border text-sm">
            <div><strong>Check in date:</strong> {formatDate(invoice.dates.checkIn)}</div>
            <div><strong>Check out date:</strong> {formatDate(invoice.dates.checkOut)}</div>
            <div><strong>Standard Check in time:</strong> {formatTime(invoice.dates.checkIn) || "02:00 PM"}</div>
            <div><strong>Standard Check out time:</strong> {formatTime(invoice.dates.checkOut) || "11:00 AM"}</div>
            <div><strong>Cancellation Policy:</strong> <span className="font-bold">{invoice.cancellationPolicy || "Non refundable"}</span></div>
          </div>
        </div>

        {/* Booking Details - Room/Guest Table */}
        <div className="mt-4 mb-8 shadow rounded overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2 text-lg font-semibold">
            Booking Details
          </div>
          <table className="w-full border text-sm [&_th]:bg-white">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 font-semibold border">Rooms</th>
                <th className="text-left py-2 px-3 font-semibold border">Guest Name</th>
                <th className="text-center py-2 px-3 font-semibold border">Occupancy (Adult)</th>
                <th className="text-center py-2 px-3 font-semibold border">Occupancy (Child Below)</th>
                <th className="text-left py-2 px-3 font-semibold border">Rate Plan</th>
                <th className="text-left py-2 px-3 font-semibold border">Meal Plan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-3 py-3">{invoice.property.name}</td>
                <td className="border px-3 py-3">{invoice.guests?.join(", ") || invoice.customer.name}</td>
                <td className="border px-3 py-3 text-center">{invoice.occupancy?.adult || "2"}</td>
                <td className="border px-3 py-3 text-center">{invoice.occupancy?.child || "0"}</td>
                <td className="border px-3 py-3">{invoice.ratePlan || "Non refundable"}</td>
                <td className="border px-3 py-3">{invoice.mealPlan || "Breakfast Included"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="mb-8 shadow rounded overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2 text-lg font-semibold">
            Payment Summary
          </div>
          <table className="w-full border text-sm [&_th]:bg-white">
            <tbody>
              <tr>
                <td className="border px-3 py-2">Room Rate</td>
                <td className="border px-3 py-2 text-right">
                  {(invoice.pricing.basePrice || 0).toLocaleString()} BDT
                </td>
              </tr>
              <tr>
                <td className="border px-3 py-2">Convenience Fee(+)</td>
                <td className="border px-3 py-2 text-right">
                  {(invoice.pricing.taxes || 0).toLocaleString()} BDT
                </td>
              </tr>
              <tr>
                <td className="border px-3 py-2 font-bold">Total Amount</td>
                <td className="border px-3 py-2 text-right font-bold">
                  {(invoice.pricing.basePrice + (invoice.pricing.taxes || 0)).toLocaleString()} BDT
                </td>
              </tr>
              <tr>
                <td className="border px-3 py-2">Discount(-)</td>
                <td className="border px-3 py-2 text-success text-right">
                  -{(invoice.pricing.discount || 0).toLocaleString()} BDT
                </td>
              </tr>
              <tr>
                <td className="border px-3 py-2 font-bold bg-blue-50">Final Amount</td>
                <td className="border px-3 py-2 text-right font-bold bg-blue-50">
                  {(invoice.pricing.totalAmount || 0).toLocaleString()} BDT
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Info (Method, Transaction, Paid Date) */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm border border-blue-200">
          <h3 className="font-semibold mb-2 text-md">Payment Information</h3>
          <div className="grid grid-cols-2 gap-2">
            <p>
              <span className="text-muted-foreground">Payment Method: </span>
              <span className="font-medium capitalize">{invoice.payment.method}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Transaction ID: </span>
              <span className="font-mono text-xs">{invoice.payment.transactionId}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Paid Date: </span>
              <span>{formatDate(invoice.payment.paidAt)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Status: </span>
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                invoice.payment.status === "confirmed"
                  ? "bg-green-200 text-green-900"
                  : "bg-yellow-100 text-yellow-900"
              }`}>
                {invoice.payment.status}
              </span>
            </p>
          </div>
        </div>

        {/* Informational Section - Booking Notes */}
        <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm">
          <h3 className="text-md font-bold mb-2">Notes</h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>During check-in, please show valid photo ID (NID/Passport/Driving License/Married documents for Couple).</li>
            <li>The final amount may include a convenience fee, if any, which is non-refundable.</li>
            <li>City/occupancy taxes, resort/hotel fees may not be included. These fees, if applicable, may be collected by the property.</li>
            <li>The guest can be asked to provide a credit card or cash deposit for guarantee of additional services such as mini-bar, pay-TV, etc.</li>
          </ul>
        </div>

        {/* Policy Section */}
        <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm">
          <h3 className="text-md font-bold mb-2">Policy</h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>The room is configured with child below 5 years.</li>
            <li>Extra child cost/extra bed not included in booking voucher amount.</li>
            <li>All special requests subject to availability upon arrival.</li>
            <li>Cancellation & amendment per booking policy; no-show, first night chargeable.</li>
            <li>Refund processed as per company policy, timing depends on your bank.</li>
          </ul>
        </div>

        {/* Thank you & Contact */}
        <div className="text-xs text-muted-foreground pt-2 pb-6 px-1">
          <p>
            Thank you for booking with <span className="font-bold text-blue-700">HangOut Tourist</span>.<br />
            For any inquiries, please contact our support:
          </p>
          <div className="pl-3 my-1">
            <div>
              <span className="font-semibold">Email:</span>{" "}
              <a href="mailto:support@hangouttourist.com" className="text-blue-600 underline">support@hangouttourist.com</a>
              <span className="mx-2">|</span>
              <span className="font-semibold">Phone:</span> <a href="tel:+880123456789" className="text-blue-600 underline">+880123456789</a>
            </div>
            <div className="mt-1">
              <span className="font-semibold">Address:</span> 3rd Floor, Grand Plaza, Uttara, Dhaka, Bangladesh
            </div>
          </div>
          <div className="mt-3 text-left">
            <p>This is an automatically generated invoice. Please print or save a copy for your reference and present it at the hotel during check-in.</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0 !important; background: #fff !important; }
          .no-print { display: none !important; }
          .print\\:max-w-full { max-width: 100% !important; }
          .print\\:p-0 { padding: 0 !important; }
          .shadow, .shadow-sm, .rounded, .rounded-xl { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default Invoice;