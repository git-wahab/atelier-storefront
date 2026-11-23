/**
 * FAQ content, shaped as `GET /faqs` returns it.
 *
 * The keys are `question` and `answer`, matching the API. They were `q` and `a`
 * before the API existed; renaming here rather than mapping at the fetch
 * boundary keeps one shape in the codebase instead of two.
 */
import type { Faq } from "./api-types";

export type { Faq };

export const faqs: Faq[] = [
  {
    question: "Where is the embroidery on the hoodie?",
    answer:
      "On both sleeves, from the shoulder down to the cuff. The body is left plain so the design stands out.",
  },
  {
    question: "Are the two sleeves identical?",
    answer:
      "They mirror each other. On Whispering Crane Bird the two cranes face each other across the body, and on Midnight Bloom the lavender sprays curve in toward the chest.",
  },
  { question: "How do I choose my size?", answer: "[SIZE GUIDE AND FIT NOTES]" },
  { question: "How should I wash it?", answer: "[CARE INSTRUCTIONS]" },
  { question: "How long does delivery take?", answer: "[DELIVERY TIMES]" },
  { question: "Can I return it?", answer: "[RETURNS POLICY]" },
];
