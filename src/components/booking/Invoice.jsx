import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, ArrowLeft } from "lucide-react";
import html2pdf from "html2pdf.js";
import logoImage from "@/assets/HangOut.svg";

// Logo with proper sizing for PDF
const Logo = () => (
  <img
    src={logoImage}
    alt="HangOut Tourist Logo"
    style={{
      height: 200,
      width: "auto",
      objectFit: "contain",
      display: "block",
      margin: "0 auto",
    }}
    className="mb-0"
  />
);

const Invoice = ({ invoice, onClose }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const invoiceRef = useRef(null);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleDownload = () => {
    if (!invoiceRef.current) return;

    const element = invoiceRef.current;
    const filename = `Invoice_${invoice.bookingNumber}.pdf`;

    const options = {
      margin: [5, 5, 5, 5],
      filename: filename,
      image: { type: "png", quality: 0.95 },
      html2canvas: {
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        imageTimeout: 0,
      },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      pagebreak: { mode: ["avoid-all"] },
    };

    // Ensure all images are loaded before creating PDF
    const images = element.querySelectorAll("img");
    let loaded = 0;

    const createPDF = () => {
      html2pdf().set(options).from(element).save();
    };

    if (images.length === 0) {
      setTimeout(createPDF, 500);
    } else {
      images.forEach((img) => {
        const checkLoad = () => {
          loaded++;
          if (loaded === images.length) {
            setTimeout(createPDF, 300);
          }
        };

        if (img.complete) {
          checkLoad();
        } else {
          img.onload = checkLoad;
          img.onerror = checkLoad;
        }
      });
    }
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

  const isHotel = invoice.bookingType === "Hotel Booking";
  const isCar = invoice.bookingType === "Car Rental";
  const isBus = invoice.bookingType === "Bus Ticket";
  const isPackage =
    invoice.bookingType === "Holiday Package" ||
    invoice.bookingType === "Package Booking";

  const headerTitle = isHotel
    ? "Hotel Booking Summary"
    : isCar
      ? "Car Rental Invoice"
      : isBus
        ? "Bus Ticket Invoice"
        : isPackage
          ? "Package Invoice"
          : "Invoice";
  const headerDesc = isHotel
    ? "Please present either an electronic or paper copy of your booking confirmation upon check-in."
    : isCar
      ? "Please present this confirmation at the rental desk."
      : isBus
        ? "Please present this ticket at the bus counter."
        : isPackage
          ? "Please keep this invoice for your holiday package booking details."
          : "Please keep this invoice for your booking details.";

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
      <div
        ref={invoiceRef}
        className="max-w-4xl mx-auto pt-10 px-8 print:p-0 print:max-w-full"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <Logo />
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold tracking-tight mb-1">
              {headerTitle}
            </h1>
            <p className="text-sm text-muted-foreground">{headerDesc}</p>
          </div>
        </div>

        {/* Main Info Panels */}
        <div className="flex flex-col md:flex-row mt-8 mb-4 gap-4 print:flex-row">
          {/* Booking Info Left Side */}
          <div className="flex-1 bg-slate-50 rounded p-4 border">
            <h3 className="font-semibold mb-3">Booking Information:</h3>
            <div className="grid grid-cols-2 gap-0">
              <div className="col-span-2 text-sm pb-2">
                <strong>Booking Reference:</strong>{" "}
                <span className="font-mono select-all">
                  {invoice.bookingNumber}
                </span>
              </div>
              <div>
                <strong>Booking Date:</strong>
                <br />
                {formatDate(invoice.bookingDate)}
              </div>
              <div>
                <strong>Booking Time:</strong>
                <br />
                {formatTime(invoice.bookingDate)}
              </div>
              {isHotel && (
                <>
                  <div>
                    <strong>Hotel confirmation no:</strong>
                    <br />
                    {invoice.hotelConfirmationNo || invoice.bookingNumber}
                  </div>
                  <div>
                    <strong>Supplier confirmation number:</strong>
                    <br />
                    {invoice.supplierConfirmationNo || invoice.bookingNumber}
                  </div>
                </>
              )}
              <div className="col-span-2">
                <strong>
                  {isHotel
                    ? "Hotel Name"
                    : isCar
                      ? "Car Name"
                      : isBus
                        ? "Bus Name"
                        : "Package Name"}
                  :
                </strong>{" "}
                <br />
                <span className="font-medium">{invoice.property.name}</span>
              </div>
              <div className="col-span-2">
                <strong>
                  {isHotel
                    ? "Hotel Address"
                    : isCar
                      ? "Rental Location"
                      : isBus
                        ? "Route"
                        : "Package Details"}
                  :
                </strong>
                <br />
                {invoice.property.details}
              </div>
            </div>
          </div>

          {/* Date Info Right Side */}
          <div className="w-full md:w-96 bg-zinc-100 rounded p-4 border text-sm">
            {isHotel && (
              <>
                <div>
                  <strong>Check in date:</strong>{" "}
                  {formatDate(invoice.dates.checkIn)}
                </div>
                <div>
                  <strong>Check out date:</strong>{" "}
                  {formatDate(invoice.dates.checkOut)}
                </div>
                <div>
                  <strong>Standard Check in time:</strong>{" "}
                  {formatTime(invoice.dates.checkIn) || "02:00 PM"}
                </div>
                <div>
                  <strong>Standard Check out time:</strong>{" "}
                  {formatTime(invoice.dates.checkOut) || "11:00 AM"}
                </div>
              </>
            )}
            {isCar && (
              <>
                <div>
                  <strong>Pickup Date:</strong>{" "}
                  {formatDate(invoice.dates.checkIn)}
                </div>
                <div>
                  <strong>Return Date:</strong>{" "}
                  {formatDate(invoice.dates.checkOut)}
                </div>
                <div>
                  <strong>Duration:</strong> {invoice.dates.days} days
                </div>
              </>
            )}
            {isBus && (
              <>
                <div>
                  <strong>Travel Date:</strong>{" "}
                  {formatDate(invoice.dates.checkIn)}
                </div>
                <div>
                  <strong>Departure Time:</strong>{" "}
                  {invoice.departureTime || "N/A"}
                </div>
                <div>
                  <strong>Pickup Location:</strong>{" "}
                  {invoice.property.details?.split(", Route: ")[1] ||
                    invoice.property.details}
                </div>
              </>
            )}
            {isPackage && (
              <>
                <div>
                  <strong>Travel Date:</strong>{" "}
                  {formatDate(invoice.dates.checkIn)}
                </div>
                <div>
                  <strong>People Count:</strong> {invoice.peopleCount || "1"}
                </div>
              </>
            )}
            <div>
              <strong>Cancellation Policy:</strong>{" "}
              <span className="font-bold">
                {invoice.cancellationPolicy || "Non refundable"}
              </span>
            </div>
          </div>
        </div>

        {/* Guest Information - Appears before Booking Details */}
        {isHotel && (
          <div className="mt-4 mb-8 bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="font-semibold mb-3 text-md">Guest Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>
                <span className="text-muted-foreground">Name: </span>
                <span className="font-medium">{invoice.customer.name}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{invoice.customer.email}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Phone: </span>
                <span className="font-medium">
                  {invoice.guestDetails?.contactNumber || "N/A"}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">NID: </span>
                <span className="font-mono text-xs">
                  {invoice.guestDetails?.nidNumber || "N/A"}
                </span>
              </p>
              <p className="col-span-2">
                <span className="text-muted-foreground">Address: </span>
                <span className="font-medium">
                  {invoice.guestDetails?.address || "N/A"}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 mb-8 shadow rounded overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2 text-lg font-semibold">
            Booking Details
          </div>
          <table className="w-full border text-sm [&_th]:bg-white">
            <thead>
              <tr>
                {isHotel && (
                  <>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Rooms
                    </th>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Guest Name
                    </th>
                    <th className="text-center py-2 px-3 font-semibold border">
                      Max Guests Allowed
                    </th>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Meal Plan
                    </th>
                  </>
                )}
                {isCar && (
                  <>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Car
                    </th>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Guest Name
                    </th>
                    <th className="text-center py-2 px-3 font-semibold border">
                      Days
                    </th>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Rate Plan
                    </th>
                  </>
                )}
                {isBus && (
                  <>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Bus
                    </th>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Passenger Name
                    </th>
                    <th className="text-center py-2 px-3 font-semibold border">
                      Seats
                    </th>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Seat Numbers
                    </th>
                  </>
                )}
                {isPackage && (
                  <>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Package
                    </th>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Lead Guest
                    </th>
                    <th className="text-center py-2 px-3 font-semibold border">
                      People
                    </th>
                    <th className="text-left py-2 px-3 font-semibold border">
                      Contact
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-3 py-3">{invoice.property.name}</td>
                <td className="border px-3 py-3">
                  {invoice.guests?.join(", ") || invoice.customer.name}
                </td>
                {isHotel && (
                  <>
                    <td className="border px-3 py-3 text-center">
                      {invoice.maxGuests || "Not Mentioned"}
                    </td>
                    <td className="border px-3 py-3">
                      {invoice.mealPlan || "Breakfast Included"}
                    </td>
                  </>
                )}
                {isCar && (
                  <>
                    <td className="border px-3 py-3 text-center">
                      {invoice.dates.days}
                    </td>
                    <td className="border px-3 py-3">
                      {invoice.ratePlan || "Standard"}
                    </td>
                  </>
                )}
                {isPackage && (
                  <>
                    <td className="border px-3 py-3 text-center">
                      {invoice.peopleCount || "1"}
                    </td>
                    <td className="border px-3 py-3">
                      {invoice.guestDetails?.name || invoice.customer.name}
                    </td>
                    <td className="border px-3 py-3 text-center">
                      {invoice.peopleCount || "1"}
                    </td>
                    <td className="border px-3 py-3">
                      {invoice.guestDetails?.email || invoice.customer.email}
                    </td>
                  </>
                )}
                {isBus && (
                  <>
                    <td className="border px-3 py-3 text-center">
                      {invoice.seats || "1"}
                    </td>
                    <td className="border px-3 py-3">
                      {invoice.seatNumbers || "N/A"}
                    </td>
                  </>
                )}
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
                <td className="border px-3 py-2">
                  {isPackage
                    ? "Package Price"
                    : isHotel
                      ? "Room Rate"
                      : isCar
                        ? "Rental Charge"
                        : isBus
                          ? "Ticket Fare"
                          : "Base Amount"}
                </td>
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
                  {(
                    invoice.pricing.basePrice + (invoice.pricing.taxes || 0)
                  ).toLocaleString()}{" "}
                  BDT
                </td>
              </tr>
              <tr>
                <td className="border px-3 py-2">Discount(-)</td>
                <td className="border px-3 py-2 text-success text-right">
                  -{(invoice.pricing.discount || 0).toLocaleString()} BDT
                </td>
              </tr>
              <tr>
                <td className="border px-3 py-2 font-bold bg-blue-50">
                  Final Amount
                </td>
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
            <p>
              <span className="text-muted-foreground">Status: </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-xs ${
                  invoice.payment.status === "confirmed"
                    ? "bg-green-200 text-green-900"
                    : "bg-yellow-100 text-yellow-900"
                }`}
              >
                {invoice.payment.status}
              </span>
            </p>
          </div>
        </div>

        {/* Informational Section - Booking Notes */}
        <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm no-pdf">
          <h3 className="text-md font-bold mb-2">Notes</h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {isHotel && (
              <>
                <li>
                  During check-in, please show valid photo ID
                  (NID/Passport/Driving License/Married documents for Couple).
                </li>
                <li>
                  The final amount may include a convenience fee, if any, which
                  is non-refundable.
                </li>
                <li>
                  City/occupancy taxes, resort/hotel fees may not be included.
                  These fees, if applicable, may be collected by the property.
                </li>
                <li>
                  The guest can be asked to provide a credit card or cash
                  deposit for guarantee of additional services such as mini-bar,
                  pay-TV, etc.
                </li>
              </>
            )}
            {isCar && (
              <>
                <li>
                  Please bring valid driver's license and photo ID at the time
                  of rental.
                </li>
                <li>
                  A valid credit card is required for the security deposit.
                </li>
                <li>
                  The vehicle must be returned with the same fuel level as
                  provided.
                </li>
                <li>
                  Additional charges may apply for damage, late return, or extra
                  mileage beyond the included limit.
                </li>
              </>
            )}
            {isBus && (
              <>
                <li>
                  Please arrive at the bus counter at least 30 minutes before
                  departure.
                </li>
                <li>Please bring a valid photo ID for verification.</li>
                <li>Keep your ticket safe and present it during boarding.</li>
                <li>
                  Passengers are responsible for their belongings. Luggage
                  allowance is as per the bus operator's policy.
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Policy Section */}
        <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm no-pdf">
          <h3 className="text-md font-bold mb-2">Policy</h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {isHotel && (
              <>
                <li>The room is configured with child below 5 years.</li>
                <li>
                  Extra child cost/extra bed not included in booking voucher
                  amount.
                </li>
                <li>
                  All special requests subject to availability upon arrival.
                </li>
                <li>
                  Cancellation & amendment per booking policy; no-show, first
                  night chargeable.
                </li>
                <li>
                  Refund processed as per company policy, timing depends on your
                  bank.
                </li>
              </>
            )}
            {isCar && (
              <>
                <li>
                  Vehicle must be returned on time as per the rental agreement.
                </li>
                <li>Any damage to the vehicle must be reported immediately.</li>
                <li>
                  Cancellation and amendments are subject to the car rental
                  policy.
                </li>
                <li>
                  Refund will be processed as per company policy after deducting
                  applicable charges.
                </li>
                <li>
                  Insurance coverage details are provided at the time of rental.
                </li>
              </>
            )}
            {isBus && (
              <>
                <li>
                  Cancellation must be done at least 24 hours before departure.
                </li>
                <li>
                  Refund is subject to the bus operator's cancellation policy.
                </li>
                <li>
                  In case of service disruption, alternative transport or refund
                  as per operator's policy.
                </li>
                <li>
                  The bus operator reserves the right to reschedule or cancel
                  services due to unforeseen circumstances.
                </li>
                <li>
                  Ticketholders are bound by the bus operator's terms and
                  conditions.
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Thank you & Contact */}
        <div className="text-xs text-muted-foreground pt-2 pb-6 px-1">
          <p>
            Thank you for booking with{" "}
            <span className="font-bold text-blue-700">HangOut Tourist</span>.
            <br />
            For any inquiries, please contact our support:
          </p>
          <div className="pl-3 my-1">
            <div>
              <span className="font-semibold">Email:</span>{" "}
              <a
                href="mailto:hangouttourist@gmail.com"
                className="text-blue-600 underline"
              >
                hangouttourist@gmail.com
              </a>
              <span className="mx-2">|</span>
              <span className="font-semibold">Phone:</span>{" "}
              <a href="tel:+8801795606900" className="text-blue-600 underline">
                +8801795-606900
              </a>
            </div>
            <div className="mt-1">
              <span className="font-semibold">Address:</span> Demra, Dhaka-1360, Bangladesh
            </div>
          </div>
          <div className="mt-3 text-left">
            <p>
              This is an automatically generated invoice. Please print or save a
              copy for your reference and present it at the hotel during
              check-in.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        .no-pdf { display: block !important; }
        
        @media print {
          body { margin: 0 !important; background: #fff !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .no-pdf { display: none !important; }
          .print\\:max-w-full { max-width: 100% !important; }
          .print\\:p-0 { padding: 0 !important; }
          .shadow, .shadow-sm { box-shadow: none !important; }
          .rounded, .rounded-xl { border-radius: 0 !important; }
          .mb-6 { margin-bottom: 8px !important; }
          .mb-4 { margin-bottom: 6px !important; }
          .mb-3 { margin-bottom: 4px !important; }
          .mb-2 { margin-bottom: 2px !important; }
          .pt-10 { padding-top: 0 !important; }
          .px-8 { padding-left: 4px !important; padding-right: 4px !important; }
          .space-y-1 > * + * { margin-top: 2px !important; }
          .text-xs { font-size: 10px !important; line-height: 1.2 !important; }
          .text-sm { font-size: 11px !important; line-height: 1.3 !important; }
          .text-md { font-size: 12px !important; }
          .text-2xl { font-size: 16px !important; }
          table { margin-bottom: 4px !important; }
          page { margin: 0 !important; padding: 0 !important; }
        }
        
        @media (max-width: 1000px) {
          .max-w-4xl { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
};

export default Invoice;
