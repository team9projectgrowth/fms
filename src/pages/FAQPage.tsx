import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQPageProps {
  onNavigate: (page: string) => void;
}

export default function FAQPage({ onNavigate }: FAQPageProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'What is Sahayak and how can it help my business?',
      answer: 'Sahayak is a comprehensive suite of business tools designed to streamline operations, improve team collaboration, and drive growth. Our platform includes customer communication tools, team management software, and advanced analytics to help businesses of all sizes work smarter and faster.'
    },
    {
      question: 'How much does Sahayak cost?',
      answer: 'We offer flexible pricing plans starting at $29/month for small teams. Our Standard plan is $79/month, and our Enterprise plan includes custom pricing with dedicated support and advanced features. All plans include a 14-day free trial with no credit card required.'
    },
    {
      question: 'Can I try Sahayak before committing to a paid plan?',
      answer: 'Absolutely! We offer a 14-day free trial for all our products. You can explore all features without entering credit card details. If you need more time to evaluate, contact our sales team for an extended trial period.'
    },
    {
      question: 'Is my data secure with Sahayak?',
      answer: 'Yes, security is our top priority. We use bank-level 256-bit encryption, maintain SOC 2 Type II compliance, and store all data in secure, redundant data centers. We also offer two-factor authentication, SSO, and regular security audits. Your data is never shared with third parties without your explicit consent.'
    },
    {
      question: 'What integrations does Sahayak support?',
      answer: 'Sahayak integrates with over 100 popular tools including Slack, Google Workspace, Microsoft 365, Salesforce, HubSpot, Zapier, and many more. We also offer a robust API and webhooks for custom integrations. Check our integrations page for the complete list.'
    },
    {
      question: 'Can I cancel my subscription at any time?',
      answer: 'Yes, you can cancel your subscription at any time with no cancellation fees or penalties. Your account will remain active until the end of your current billing period, and you can export all your data before canceling.'
    },
    {
      question: 'Do you offer training and onboarding support?',
      answer: 'Yes! All plans include access to our comprehensive knowledge base, video tutorials, and email support. Standard and Enterprise plans also include personalized onboarding sessions with our customer success team and ongoing training webinars.'
    },
    {
      question: 'What kind of customer support do you provide?',
      answer: 'We offer multiple support channels including email support (response within 24 hours), live chat during business hours, and a detailed help center. Enterprise customers receive priority support with dedicated account managers and 24/7 phone support.'
    },
    {
      question: 'Can Sahayak scale with my growing business?',
      answer: 'Absolutely! Sahayak is built to scale from small startups to large enterprises. You can easily upgrade your plan, add more users, and access advanced features as your business grows. Our infrastructure handles millions of transactions daily without compromising performance.'
    },
    {
      question: 'What happens to my data if I decide to leave Sahayak?',
      answer: 'You maintain complete ownership of your data. Before canceling, you can export all your data in standard formats (CSV, JSON, PDF). We provide easy-to-use export tools and can assist with data migration. After cancellation, we retain your data for 30 days in case you change your mind, then permanently delete it upon your request.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="text-white" size={40} />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions about Sahayak and our services.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden hover:border-teal-500 transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <span className="text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`text-teal-600 flex-shrink-0 transition-transform ${
                      openIndex === index ? 'transform rotate-180' : ''
                    }`}
                    size={24}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-5">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Still Have Questions?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Our support team is here to help you. Get in touch and we'll respond as soon as possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('support')}
              className="px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Contact Support
            </button>
            <button className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold border-2 border-gray-300 hover:border-teal-500 transition-colors">
              Visit Help Center
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
