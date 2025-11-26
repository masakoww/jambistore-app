'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'How do I receive my product after purchase?',
    answer: 'After successful payment, you will receive an email with your product key/download link instantly. You can also access your purchase from your account dashboard under "My Orders".',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept Visa, Mastercard, PayPal, and QRIS for Indonesian customers. All payments are processed securely through our encrypted payment gateway.',
  },
  {
    question: 'Can I get a refund if I change my mind?',
    answer: 'Due to the nature of digital products, we offer refunds only if the product is defective or not as described. Refund requests must be submitted within 24 hours of purchase with valid proof of the issue.',
  },
  {
    question: 'How long does my product license last?',
    answer: 'License duration varies by product. Most products offer 30-day, 90-day, or lifetime licenses. Check the product description for specific details. Subscription-based products will auto-renew unless cancelled.',
  },
  {
    question: 'What if my product key doesn\'t work?',
    answer: 'Contact our support team immediately through live chat or email. We will verify your purchase and provide a replacement key within 1-2 hours. Make sure you\'re following the activation instructions correctly.',
  },
  {
    question: 'Do you provide customer support?',
    answer: 'Yes, we offer 24/7 customer support via Discord live chat and email. Our team responds to most inquiries within 15-30 minutes. We also have a comprehensive knowledge base for common issues.',
  },
  {
    question: 'Is my payment information secure?',
    answer: 'Absolutely. We use industry-standard SSL encryption and never store your credit card details. All transactions are processed through PCI-DSS compliant payment processors.',
  },
  {
    question: 'Can I use the product on multiple devices?',
    answer: 'This depends on the specific product license. Most products allow 1-2 device activations. Check the product page for exact device limits. Enterprise licenses are available for multiple devices.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 px-4 bg-black">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            FREQUENTLY ASKED QUESTIONS
          </h2>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-white/10 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm hover:border-purple-500/50 transition-colors"
            >
              {/* Question */}
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-lg font-semibold text-white">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Answer */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-4 text-gray-400">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
