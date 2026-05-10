import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, ArrowLeft } from "lucide-react";

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
    // In a real app, this would generate a PDF
    // For now, we'll trigger print and save as PDF
    handlePrint();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
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
    <div className="w-full bg-white">
      {/* Print Controls */}
      <div className="flex gap-2 justify-between p-4 bg-background border-b no-print">
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

      {/* Invoice Content */}
      <div className="p-8 max-w-3xl mx-auto print:max-w-full print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              HangOut Tourist
            </h1>
            <p className="text-sm text-muted-foreground">
              Your Complete Travel Companion
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Invoice</p>
            <p className="text-lg font-bold">{invoice.bookingNumber}</p>
            <p className="text-xs text-muted-foreground">
              {invoice.invoiceDate}
            </p>
          </div>
        </div>

        {/* Invoice Details Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Bill To */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">
              BILL TO
            </h3>
            <div className="space-y-1">
              <p className="font-medium">{invoice.customer.name}</p>
              <p className="text-sm text-muted-foreground">
                {invoice.customer.email}
              </p>
              <p className="text-sm text-muted-foreground">
                {invoice.customer.phone}
              </p>
            </div>
          </div>

          {/* Booking Info */}
          <div className="text-right">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">
              BOOKING INFO
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium">{invoice.bookingType}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Booking Date: </span>
                <span className="font-medium">
                  {formatDate(invoice.bookingDate)}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Status: </span>
                <span
                  className={`font-medium px-2 py-0.5 rounded text-xs ${
                    invoice.payment.status === "confirmed"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {invoice.payment.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3">Booking Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Property</p>
              <p className="font-medium">{invoice.property.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {invoice.property.details}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Check-in</p>
              <p className="font-medium">{formatDate(invoice.dates.checkIn)}</p>
              <p className="text-xs text-muted-foreground">
                {formatTime(invoice.dates.checkIn)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Check-out</p>
              <p className="font-medium">
                {formatDate(invoice.dates.checkOut)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTime(invoice.dates.checkOut)}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Table */}
        <div className="mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2">
                <th className="text-left py-2 font-semibold">Description</th>
                <th className="text-center py-2 font-semibold">Nights</th>
                <th className="text-right py-2 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">{invoice.property.name}</td>
                <td className="text-center">{invoice.dates.days}</td>
                <td className="text-right">
                  ৳{(invoice.pricing.basePrice || 0).toLocaleString()}
                </td>
              </tr>
              {invoice.pricing.taxes > 0 && (
                <tr className="border-b">
                  <td colSpan="2" className="py-3">
                    Taxes & Fees
                  </td>
                  <td className="text-right">
                    ৳{invoice.pricing.taxes.toLocaleString()}
                  </td>
                </tr>
              )}
              {invoice.pricing.discount > 0 && (
                <tr className="border-b">
                  <td colSpan="2" className="py-3">
                    Discount
                  </td>
                  <td className="text-right text-success">
                    -৳{invoice.pricing.discount.toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-full max-w-xs">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>৳{(invoice.pricing.basePrice || 0).toLocaleString()}</span>
            </div>
            {invoice.pricing.taxes > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Taxes & Fees:</span>
                <span>৳{invoice.pricing.taxes.toLocaleString()}</span>
              </div>
            )}
            {invoice.pricing.discount > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-success">
                  -৳{invoice.pricing.discount.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between py-3 font-bold text-lg bg-primary/5 px-3 rounded">
              <span>Total:</span>
              <span className="text-primary">
                ৳{invoice.pricing.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
          <h3 className="font-semibold mb-2 text-sm">Payment Information</h3>
          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Method: </span>
              <span className="font-medium capitalize">
                {invoice.payment.method}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Transaction ID: </span>
              <span className="font-mono text-xs">
                {invoice.payment.transactionId}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Paid Date: </span>
              <span>{formatDate(invoice.payment.paidAt)}</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          <p>Thank you for choosing HangOut Tourist!</p>
          <p className="mt-1">
            For any inquiries, please contact our support team.
          </p>
          <p className="mt-2 text-xs">
            This is an automatically generated invoice. It is valid without a
            signature.
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none;
          }
          .print\\:max-w-full {
            max-width: 100%;
          }
          .print\\:p-0 {
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Invoice;
