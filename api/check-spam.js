export default async function handler(req, res) {
  // ——— CORS HEADERS ———
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { email } = req.body;

  if (!email || email.trim().length === 0) {
    return res.status(400).json({ error: 'Email content is required' });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({ error: 'Missing OpenAI API key' });
  }

  // 🔥 SYSTEM PROMPT with expanded categories
  const systemPrompt = `
You are a cold email spam risk evaluator. Your job is to detect language, structure, or patterns that are likely to cause a cold email to be flagged by spam filters.

You've been trained on a comprehensive spam phrase database. Here are key category signals to watch for:

Urgency: Act now, Limited time, Urgent, Do it today, Don’t wait, Apply now, Call now, Order now, Get it now, Hurry up, Final call, Take action, This won’t last, Time limited, Offer expires, Expires today, Do it now, Access now, Act fast, Act immediately, Action required, Apply here, Apply now!, Buy today, Cancel now, Claim now, Click now, Click to get, Click to remove, Contact us immediately, For instant access, Get started now, Immediately, Now only, Purchase now, Supplies are limited, Take action now, Today, Top urgent, What are you waiting for?, While supplies last, Final notice, Last warning

Shady: Private funds, Bank account, Confidential, Check or money order, Social security number, Requires initial investment, Internet marketing, Mass email, Bulk email, Multi-level marketing, Not junk, Notspam, Hidden charges, No hidden costs, No hidden fees, No questions asked, No strings attached, Cancel at any time, Dear friend, Direct email, Direct marketing, Human growth hormone, Undisclosed, Unsolicited, Phishing alert, Unsecured credit, Unsecured debt, Security breach, Warning message, Adult content

Overpromise: 100% guaranteed, Double your income, Risk-free, No investment, Earn extra cash, Earn money, Earn from home, Make money, Double your cash, Double your money, Double your wealth, Extra income, Extra cash, Be amazed, Be surprised, Expect to earn, Financial freedom, Full refund, Get paid, Instant earnings, Instant income, Money-back guarantee, Potential earnings, Pure profit, Profits, Prize, Promise, Satisfaction guaranteed, You will not believe your eyes, Will not believe, Win, Winner, Winning numbers, You are a winner, Winner announced, Best deal, Amazing deal, Incredible deal, Fantastic offer, Guaranteed results, Great offer, Join millions, Once in a lifetime, One hundred percent free, Only available here, Lowest price, Save up to, Save big money

Unnatural: Dear friend, This isn't spam, This isn’t junk, You've been selected, You have been selected, This message is to inform you, Important information, Important information regarding, Info you requested, Information you requested, Message contains, Please read, See for yourself, Exclusive deal, Special invitation, For you, Being a member, We hate spam, Click me to download, Click this link, You will not believe, Get it away, Claim your discount

Financial: Credit card offers, Loans, Refinance, Debt, Guaranteed deposit, Credit, Credit bureaus, Credit or Debit, Mortgage, Mortgage rates, Earn $, Income, Investment, Investment advice, Price, Save $, US Dollars, Dollars, Billion, Billionaire, Million dollars, Payment details needed, Subject to credit, Cash, Cash out, Cash bonus, Cash-out, Costs, Affordable, Affordable deal, Avoid bankruptcy, Bankruptcy, Bad credit, Insurance, Billing, Billing address, Bank, Discount, Offer, Price protection, Quote, Compare rates

Pharma: Viagra, Xanax, Lose weight fast, No prescription needed, Miracle cure, Valium, Vicodin, Lose weight, Fat burner, Diet pill, Weight loss, Fast weight loss, Guaranteed weight loss, Get slim, Hair growth, Safe and effective, Natural remedy, All natural, 100% natural, Certified organic, Doctor recommended, Clinical trial, Double blind study, Reverse aging, Youthful skin, Cures, Online pharmacy, Over-the-counter, Medical breakthrough

Casino/Gambling: Jackpot, Big win, Free chips, Gamble online, Spin to win, Online betting, Online casino, Online gaming, Poker tournament, Risk-free bet, Slots jackpot, Instant winnings, Click to win, Bet now, Live dealer, Lucky chance, Winner announced, VIP offer

Legalese/Jargon: Subject to terms, Sent in compliance, Not junk, In accordance with laws, Terms and conditions, Reserves the right, Access your account, Account update, Activate now, Change password, Confirm your details, Final notice, Immediate action required, Important update, Install now, Last warning, Log in now, New login detected, Online account, Password reset, Secure payment, Security update, Update account, Verify identity

Other Spam: Free trial, Access your account, Click here, $$$, Get it now, Sign up free, Free preview, Free money, Free consultation, Free investment, Free gift, Free info, Free access, Free hosting, Free membership, Free quote, Sign up free today, Access, Get started, Get started now, €€€, £££, F r e e, For free, Only $, For just $, Ad, As seen on, All new, Best price, Certified, Name brand, Marketing solution, Online marketing, Search engine, Web traffic, Trial, Unlimited, Amazing stuff, Great news, Amazing offer, Special promotion, Friday before [holiday], Amazing, Wonderful, Can’t live without, The best, Be your own boss, Work from home, Additional income, Bonus, Bargain, Deal

Your task:
- Read the email content
- Detect problematic or spammy language (both exact and similar)
- Return a structured JSON like this:

{
  "score": [0-100],
  "verdict": [string],
  "categories": {
    "Urgency": [...],
    "Shady": [...],
    "Overpromise": [...],
    "Unnatural": [...],
    "Financial": [...],
    "Pharma": [...],
    "Casino": [...],
    "Legalese": [...],
    "Other": [...]
  },
  "feedback": [1 paragraph with explanation],
  "recommendation": [1 paragraph of advice],
  "rewrite_suggestions": [
    "Better subject line #1",
    "Better subject line #2",
    "Better subject line #3"
  ]
}

Be concise, accurate, and never explain the format. Just return clean JSON.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Evaluate this email:\n\n${email}` }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      return res.status(500).json({ error: 'Failed to get response from AI' });
    }

    const json = JSON.parse(result);
    return res.status(200).json(json);

  } catch (err) {
    console.error('Spam check error:', err);
    return res.status(500).json({ error: 'OpenAI API error' });
  }
}
