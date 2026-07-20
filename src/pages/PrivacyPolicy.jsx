import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Helmet } from "react-helmet";
export default function PrivacyPolicy() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Hang Out Tourist | Privacy Policy</title>
      </Helmet>
      <Navbar />
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
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <section className="mb-10">
            <p className="text-gray-700 leading-8">
              At <strong>Hang Out Tourist</strong>, we value your privacy and
              are committed to protecting your personal information. This
              Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our website, mobile
              application, or booking services. By accessing or using our
              services, you agree to the practices described in this Privacy
              Policy.
            </p>
          </section>

          {/* 1 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              1. Information We Collect
            </h2>

            <p className="text-gray-700 mb-5">
              We may collect the following categories of personal information:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Full name</li>
              <li>Mobile phone number</li>
              <li>Email address</li>
              <li>
                Government-issued identification details (such as National ID or
                Passport), where required
              </li>
              <li>Hotel booking and reservation information</li>
              <li>
                Payment-related information (processed securely through
                authorized payment providers)
              </li>
              <li>
                Any additional information voluntarily provided by you during
                the booking or customer support process
              </li>
            </ul>
          </section>

          {/* 2 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              2. How We Use Your Information
            </h2>

            <p className="text-gray-700 mb-5">
              Your personal information may be used for the following purposes:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Processing and managing hotel reservations</li>
              <li>Verifying payments and preventing fraudulent transactions</li>
              <li>Providing customer support and responding to inquiries</li>
              <li>
                Communicating booking confirmations, updates, and important
                service notifications
              </li>
              <li>
                Complying with applicable legal, regulatory, and contractual
                obligations
              </li>
              <li>
                Improving our services, website functionality, and customer
                experience
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              3. Information Sharing and Disclosure
            </h2>

            <p className="text-gray-700 mb-5">
              We may share your personal information only when necessary and for
              legitimate business purposes, including:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                With the respective hotel to complete and manage your
                reservation
              </li>
              <li>
                With authorized payment service providers to process
                transactions securely
              </li>
              <li>
                With trusted third-party service providers who assist in
                operating our services
              </li>
              <li>
                With government authorities, regulatory bodies, or law
                enforcement agencies where required by applicable law or legal
                process
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              4. Protection of Your Personal Information
            </h2>

            <p className="text-gray-700 leading-8">
              We do not sell, rent, or trade your personal information to third
              parties for marketing or commercial purposes without your explicit
              consent, except where disclosure is required by law or is
              necessary to provide our services.
            </p>
          </section>

          {/* 5 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              5. Data Security
            </h2>

            <p className="text-gray-700 leading-8">
              We implement reasonable administrative, technical, and
              organizational security measures to protect your personal
              information from unauthorized access, disclosure, alteration, or
              destruction. While we strive to safeguard your data, no method of
              electronic transmission or online storage is completely secure.
              Accordingly, we cannot guarantee absolute security.
            </p>
          </section>

          {/* 6 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              6. Data Retention
            </h2>

            <p className="text-gray-700 leading-8">
              We retain your personal information only for as long as necessary
              to fulfill the purposes outlined in this Privacy Policy, comply
              with legal obligations, resolve disputes, and enforce our
              contractual rights.
            </p>
          </section>

          {/* 7 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              7. Changes to This Privacy Policy
            </h2>

            <p className="text-gray-700 leading-8">
              Hang Out Tourist reserves the right to modify or update this
              Privacy Policy at any time. Any changes will become effective upon
              publication on our website unless otherwise required by applicable
              law. We encourage users to review this Privacy Policy
              periodically.
            </p>
          </section>

          {/* 8 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              8. Your Acceptance of This Policy
            </h2>

            <p className="text-gray-700 leading-8">
              By accessing or using the services of Hang Out Tourist, you
              acknowledge that you have read, understood, and agreed to this
              Privacy Policy. If you do not agree with any part of this Policy,
              you should discontinue the use of our services.
            </p>
          </section>

          {/* 9 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              9. Contact Us
            </h2>

            <p className="text-gray-700 mb-8">
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or the handling of your personal information,
              please contact us through the official customer support channels
              provided on the Hang Out Tourist website.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 mt-1 text-gray-700" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">privacy@hangouttourist.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 mt-1 text-gray-700" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">+880-1700-123-456</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-1 text-gray-700" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">
                    Hang Out Tourist
                    <br />
                    Dhaka, Bangladesh
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
