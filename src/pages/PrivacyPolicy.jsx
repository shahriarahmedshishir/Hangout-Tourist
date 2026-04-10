import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-2 text-gray-900">
          Privacy Policy
        </h1>
        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">
              1. Introduction
            </h2>
            <p>
              Welcome to Hangout Tourist. We are committed to protecting your
              personal data and respecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you visit our website and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">
              2. Information We Collect
            </h2>
            <p>We may collect information about you in a variety of ways:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>
                <strong>Personal Data:</strong> Name, email address, phone
                number, and payment information
              </li>
              <li>
                <strong>Booking Information:</strong> Travel dates, preferences,
                and destination choices
              </li>
              <li>
                <strong>Device Information:</strong> IP address, browser type,
                and operating system
              </li>
              <li>
                <strong>Usage Data:</strong> Pages visited, time spent, and
                interactions with our platform
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">
              3. How We Use Your Information
            </h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Process and fulfill your bookings and purchases</li>
              <li>Send you transaction confirmations and updates</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve our website, services, and user experience</li>
              <li>Comply with legal obligations</li>
              <li>Prevent fraud and enhance security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">
              4. Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal data against unauthorized access,
              alteration, disclosure, or destruction. However, no method of
              transmission over the internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">
              5. Your Rights
            </h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent at any time</li>
              <li>Request a copy of your data in a portable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">
              6. Cookies
            </h2>
            <p>
              Our website uses cookies to enhance your experience. You can
              control cookie settings through your browser preferences. Some
              features of the website may not function properly if cookies are
              disabled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">
              7. Third-Party Links
            </h2>
            <p>
              Our website may contain links to third-party websites. We are not
              responsible for the privacy practices of these external sites and
              encourage you to review their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">
              8. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy or your
              personal data, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-gray-100 rounded">
              <p>
                <strong>Email:</strong> privacy@hangoutourist.com
              </p>
              <p>
                <strong>Address:</strong> Your Company Address
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by updating the "Last updated" date at
              the top of this page. Your continued use of the website following
              such modifications constitutes your acceptance of the updated
              Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
