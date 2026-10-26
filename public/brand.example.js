// Brand profile - the knowledge IdeaBank feeds to Claude before every request.
//
// This is the placeholder that ships with the repo. To make the app write for
// a real brand, copy this file to brand.local.js and fill it in. brand.local.js
// is gitignored, so confidential brand material never reaches version control.
//
//     copy brand.example.js brand.local.js
//
// The server serves brand.local.js as /brand.js when it exists, and falls back
// to this file when it does not.
//
// Every entry is one line of plain text handed to the model. Be specific and
// prescriptive - "never claim comfort, describe it" beats "use a warm tone".

window.BRAND_PROFILE = [
  '# WHO THE BRAND IS',
  'Name, category and what it sells. One line of positioning - the sentence the brand would use about itself.',
  'Tagline.',
  'Vision and mission.',
  'Values and brand attributes.',
  'What genuinely makes it different from the next brand in the category.',
  '',
  '# PERSONALITY',
  'If the brand were a person, who? Use oppositions - they are far more useful to a writer than adjectives.',
  'e.g. "Warm NOT sentimental. Direct NOT blunt. Expert NOT condescending."',
  'Describe the voice: what it sounds like, what it would never say.',
  '',
  '# AUDIENCE',
  'Who the communication is aimed at - age, place, life stage.',
  'The mindset: what they want, what they are tired of, what they are actually buying.',
  'What drives the purchase, in order.',
  '',
  '# TONE OF VOICE - RULES, NOT SUGGESTIONS',
  'Write these as hard rules with examples of right and wrong. They do the most work of anything in this file.',
  'e.g. "Write it the way you would say it out loud. If you would not say it, cut it."',
  'e.g. "Avoid cliche adjectives. Paint a physical situation instead."',
  'Name the words the category has worn out, so the model avoids them.',
  '',
  '# FILM GUIDELINES',
  'How films open and close - start slate, end slate, how long the logo holds.',
  'How on-screen text is set: typeface, how many words, where it sits.',
  'Transitions, devices or visual signatures the brand owns.',
  'Anything forbidden - e.g. where the logo may not appear.',
  '',
  '# PALETTE',
  'Primary colors with hex values. Secondary accents with hex values. The mood they add up to.',
  '',
  '# TRUE THINGS YOU MAY USE',
  'Verifiable facts: founding year, scale, materials, awards. The model is told not to invent beyond this list.',
  'Real product names, so it does not make them up.',
  '',
  '# CRAFT REFERENCE',
  'Brands whose advertising craft is worth borrowing, and what specifically to borrow from each.',
  'Where the work will actually run, and what performs there.',
  'One line on what the brand is NOT, so the references do not pull it off course.',
];

window.BRAND_IS_PLACEHOLDER = true;
