import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from '../components/layout/Navbar';

export default function PrivacyPolicy() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar/>
      {/* Header */}
      <div className=" bg-white sticky top-0 z-50">
        <div className="container px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Privacy Policy
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {currentDate}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto prose prose-sm sm:prose lg:prose-lg">
          {/* Introduction */}
          <section className="mb-8 sm:mb-12">
            <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
              Welcome to Hangout Tourist. We are committed to protecting your
              personal data and respecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you visit our website and use our services.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-700 mb-4">
              We may collect information about you in a variety of ways:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="text-gray-900 font-semibold min-w-fit">
                  Personal Data:
                </span>
                <span>
                  Name, email address, phone number, and payment information
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-gray-900 font-semibold min-w-fit">
                  Booking Information:
                </span>
                <span>Travel dates, preferences, and destination choices</span>
              </li>
              <li className="flex gap-3">
                <span className="text-gray-900 font-semibold min-w-fit">
                  Device Information:
                </span>
                <span>IP address, browser type, and operating system</span>
              </li>
              <li className="flex gap-3">
                <span className="text-gray-900 font-semibold min-w-fit">
                  Usage Data:
                </span>
                <span>
                  Pages visited, time spent, and interactions with our platform
                </span>
              </li>
            </ul>
          </section>

          {/* 2. How We Use Your Information */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-700 mb-4">
              We use the collected information to:
            </p>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li>Process and fulfill your bookings and purchases</li>
              <li>Send you transaction confirmations and updates</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve our website, services, and user experience</li>
              <li>Comply with legal obligations</li>
              <li>Prevent fraud and enhance security</li>
            </ul>
          </section>

          {/* 3. Data Security */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              3. Data Security
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We implement appropriate technical and organizational measures to
              protect your personal data against unauthorized access,
              alteration, disclosure, or destruction. However, no method of
              transmission over the internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          {/* 4. Your Rights */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              4. Your Rights
            </h2>
            <p className="text-gray-700 mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent at any time</li>
              <li>Request a copy of your data in a portable format</li>
            </ul>
          </section>

          {/* 5. Cookies */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              5. Cookies
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Our website uses cookies to enhance your experience. You can
              control cookie settings through your browser preferences. Some
              features of the website may not function properly if cookies are
              disabled.
            </p>
          </section>

          {/* 6. Third-Party Links */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              6. Third-Party Links
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Our website may contain links to third-party websites. We are not
              responsible for the privacy practices of these external sites and
              encourage you to review their privacy policies.
            </p>
          </section>

          {/* 7. Contact Us */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              7. Contact Us
            </h2>
            <p className="text-gray-700 mb-6">
              If you have any questions about this Privacy Policy or your
              personal data, please contact us:
            </p>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium break-all">
                    privacy@hangoutourist.com
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900 font-medium">+880-1700-123-456</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-gray-900 font-medium">
                    Hangout Tourist Services<br />
                    123 Travel Street, Dhaka, Bangladesh
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 8. Changes to This Policy */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              8. Changes to This Policy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by updating the "Last updated" date at
              the top of this page. Your continued use of the website following
              such modifications constitutes your acceptance of the updated
              Privacy Policy.
            </p>
          </section>

          {/* Closing */}
          <section className="pt-8 sm:pt-12 border-t border-gray-200">
            <p className="text-gray-700 leading-relaxed">
              Thank you for trusting Hangout Tourist with your personal
              information. We are committed to maintaining your privacy and
              ensuring you have a positive experience on our platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}