import React from 'react';

export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="mb-4 text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
                <p className="mb-4">
                    We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us. This may include your name, email address, and study preferences.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
                <p className="mb-4">
                    We use the information we collect to provide, maintain, and improve our services, to develop new ones, and to protect studybar.academy and our users.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
                <p className="mb-4">
                    We do not share your personal information with companies, organizations, or individuals outside of studybar.academy except in the following cases: with your consent, for legal reasons, or to protect our rights.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
                <p className="mb-4">
                    We work hard to protect studybar.academy and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold.
                </p>
            </section>
        </div>
    );
}
