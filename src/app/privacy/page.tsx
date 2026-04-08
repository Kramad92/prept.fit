import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Prept",
  description: "Prept privacy policy — how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: April 8, 2026</p>

        <div className="mt-10 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="mt-2">
              Prept (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Prept mobile
              application and web platform. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>
            <h3 className="mt-4 font-semibold text-gray-800">Account Information</h3>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Name, email address, and password</li>
              <li>Profile photo (optional)</li>
              <li>Role (coach or client)</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-800">Health &amp; Fitness Data</h3>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Workout plans, exercise logs, and training history</li>
              <li>Nutrition plans, meal logs, and dietary preferences</li>
              <li>Body measurements and progress photos</li>
              <li>Habit tracking data</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-800">Device &amp; Usage Data</h3>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Device type, operating system, and app version</li>
              <li>Push notification tokens</li>
              <li>General usage patterns (pages visited, features used)</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-800">Camera &amp; Photo Library</h3>
            <p className="mt-2">
              We request access to your camera and photo library solely for uploading progress
              photos. Photos are stored securely and are only visible to you and your assigned coach.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>To provide and maintain our fitness coaching platform</li>
              <li>To facilitate communication between coaches and clients</li>
              <li>To track and display your fitness progress</li>
              <li>To send push notifications about workouts, messages, and reminders</li>
              <li>To process payments and manage subscriptions</li>
              <li>To improve and optimize our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Data Sharing</h2>
            <p className="mt-2">
              We do <strong>not</strong> sell, rent, or trade your personal information to third
              parties. Your data is shared only in the following circumstances:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                <strong>With your coach:</strong> Clients&apos; fitness data, progress photos, and
                messages are visible to their assigned coach.
              </li>
              <li>
                <strong>Service providers:</strong> We use trusted third-party services for hosting,
                file storage, email delivery, and payment processing. These providers only access
                data necessary to perform their services.
              </li>
              <li>
                <strong>Legal requirements:</strong> We may disclose information if required by law
                or to protect our rights and safety.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Data Storage &amp; Security</h2>
            <p className="mt-2">
              Your data is stored on secure servers with encryption in transit and at rest. We use
              industry-standard security measures to protect your information. Progress photos and
              files are stored in encrypted cloud storage with access controls.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Data Retention</h2>
            <p className="mt-2">
              We retain your data for as long as your account is active. If you delete your account,
              we will delete your personal data within 30 days, except where retention is required by
              law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Your Rights</h2>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent for data processing</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Push Notifications</h2>
            <p className="mt-2">
              We send push notifications for workout reminders, messages from your coach, and
              important account updates. You can disable notifications at any time through your
              device settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Children&apos;s Privacy</h2>
            <p className="mt-2">
              Our services are not intended for children under the age of 16. We do not knowingly
              collect personal information from children under 16.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Contact Us</h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy or your data, please contact us at{" "}
              <a href="mailto:support@prept.fit" className="text-emerald-600 hover:underline">
                support@prept.fit
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
