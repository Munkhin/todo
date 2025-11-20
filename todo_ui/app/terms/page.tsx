import React from 'react';

export default function TermsOfService() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
            <p className="mb-4 text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                <p className="mb-4">
                    Welcome to studybar.academy. By accessing or using our website and services, you agree to be bound by these Terms of Service and all applicable laws and regulations.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
                <p className="mb-4">
                    Permission is granted to temporarily download one copy of the materials (information or software) on studybar.academy's website for personal, non-commercial transitory viewing only.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Disclaimer</h2>
                <p className="mb-4">
                    The materials on studybar.academy's website are provided on an 'as is' basis. studybar.academy makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Limitations</h2>
                <p className="mb-4">
                    In no event shall studybar.academy or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on studybar.academy's website.
                </p>
            </section>
        </div>
    );
}
