"use client";

import React, { useState } from "react";
import Icon from "@/components/Icon";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const FaqItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-base-200 rounded-lg overflow-hidden bg-base-100 mb-3 transition-all hover:border-primary/30">
            <button
                className="w-full flex items-center justify-between p-4 bg-base-100 hover:bg-base-200/50 transition-colors text-left"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-medium text-base-content">{question}</span>
                <Icon
                    name={isOpen ? "ChevronUp" : "ChevronDown"}
                    size={18}
                    className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
            >
                <div className="p-4 pt-0 text-sm text-base-content/70 leading-relaxed border-t border-base-200/50 bg-base-50/50">
                    {answer}
                </div>
            </div>
        </div>
    );
};

const HelpPage = () => {
    const faqs = [
        {
            question: "How do I start earning commissions?",
            answer: "Navigate to the 'Campaigns' page, browse available offers, and click 'Get Link'. Share this unique tracking link with your audience. You'll earn commissions for every valid action (sale, click, or lead) tracked through your link."
        },
        {
            question: "When are payouts processed?",
            answer: "Payouts are processed on a monthly basis. Once your approved earnings reach the minimum threshold of ₹5,000, you can request a withdrawal from the 'Payouts' section. Payments are typically released within 5-7 business days."
        },
        {
            question: "How does the tracking work?",
            answer: "We use advanced cookie-based and server-side tracking. When a user clicks your link, a tracking cookie is placed on their device (valid for 30-90 days depending on the campaign). If they convert within this window, the sale is attributed to you."
        },
        {
            question: "Can I create my own campaigns?",
            answer: "Currently, campaigns are managed globally by the platform administrators to ensure quality and tracking accuracy. As an affiliate, you can choose from any of the high-converting campaigns available in the marketplace."
        },
        {
            question: "My stats aren't updating immediately. Why?",
            answer: "While clicks are tracked in near real-time, conversions and revenue data may take up to 1-2 hours to sync effectively, depending on the postback frequency from the merchant. Please check back after a short while."
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
                    <Icon name="HelpCircle" className="text-primary" size={32} />
                    Help & Support
                </h1>
                <p className="text-base-content/60 mt-1">
                    Find answers to common questions or get in touch with our support team.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: FAQs */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Frequently Asked Questions" icon="MessageCircle">
                        <div className="mt-2">
                            {faqs.map((faq, i) => (
                                <FaqItem key={i} question={faq.question} answer={faq.answer} />
                            ))}
                        </div>
                    </Card>

                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center shrink-0 mb-2 md:mb-0">
                            <Icon name="BookOpen" size={32} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-base-content">Developer Documentation</h3>
                            <p className="text-sm text-base-content/70 mt-1">
                                Need to integrate postbacks or use our API? Check out our detailed technical documentation.
                            </p>
                        </div>
                        <Button variant="outline" className="shrink-0">
                            View Docs
                        </Button>
                    </div>
                </div>

                {/* Sidebar: Contact & Status */}
                <div className="space-y-6">
                    {/* Contact Support */}
                    <div className="card bg-base-100 shadow-xl border border-base-200">
                        <div className="card-body">
                            <h2 className="card-title flex items-center gap-2 text-primary">
                                <Icon name="LifeBuoy" size={24} />
                                Contact Support
                            </h2>
                            <p className="text-sm opacity-70 mb-4">
                                Can't find what you're looking for? Our dedicated affiliate manager is here to help.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
                                    <Icon name="Mail" size={18} className="text-base-content/50" />
                                    <a href="mailto:support@affiliatepro.com" className="text-sm font-medium hover:text-primary transition-colors">
                                        support@affiliatepro.com
                                    </a>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
                                    <Icon name="Phone" size={18} className="text-base-content/50" />
                                    <span className="text-sm font-medium">
                                        +1 (555) 123-4567
                                    </span>
                                </div>
                            </div>

                            <div className="divider my-2"></div>

                            <div className="text-xs text-base-content/50 text-center">
                                Support Hours: Mon-Fri, 9AM - 6PM EST
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <Card title="Quick Resources">
                        <ul className="menu bg-base-100 w-full p-0 [&_li>*]:border-b [&_li>*]:border-base-200">
                            <li>
                                <a className="flex justify-between hover:bg-base-200/50">
                                    <span>Getting Started Guide</span>
                                    <Icon name="ChevronRight" size={14} className="opacity-50" />
                                </a>
                            </li>
                            <li>
                                <a className="flex justify-between hover:bg-base-200/50">
                                    <span>Terms of Service</span>
                                    <Icon name="ChevronRight" size={14} className="opacity-50" />
                                </a>
                            </li>
                            <li>
                                <a className="flex justify-between hover:bg-base-200/50">
                                    <span>Privacy Policy</span>
                                    <Icon name="ChevronRight" size={14} className="opacity-50" />
                                </a>
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default HelpPage;
