# 💰 Bill Splitter Pro

A smart, interactive web application for splitting bills fairly among friends, with support for individual quantities, shared items, and opt-out features.

## ✨ Features

### 🧮 Smart Splitting Options

- **Individual Items**: Track quantities per person (perfect for "I had 1 beer, you had 3")
- **Shared Items**: Split costs equally among selected people (taxes, appetizers, etc.)
- **Decimal Quantities**: Support for partial items (0.5 dessert, 0.33 pizza slice)
- **Opt-out Functionality**: Exclude people from specific shared items (vegetarians from non-veg dishes)
- **📸 Receipt Scanning**: Upload a photo of your bill and have items extracted for you (powered by a vision model via [OpenRouter](https://openrouter.ai))
- **📱 Mobile-Friendly**: Responsive layout with large tap targets and a horizontally-scrollable bill table on small screens

### 🎯 Key Capabilities

- Real-time calculations as you input data
- Detailed breakdown showing exactly what each person owes
- Indian Rupee (₹) currency support
- Clean, responsive interface
- One-click data clearing
- Visual indicators for included/excluded shared items

### 🍕 Perfect For

- Restaurant bills with mixed individual and shared orders
- Group dinners where people have different dietary preferences
- Bar tabs with varying drink consumption
- Any scenario where fair splitting matters

## 🚀 Quick Start

1. **Add People**: Enter names of everyone in your group
2. **Add Items**:
   - For individual items (drinks, personal dishes): Enter unit price and quantities per person
   - For shared items (taxes, appetizers): Check "Shared item" and enter total amount
3. **Customize**: Uncheck people from shared items if they shouldn't pay (e.g., vegetarians from meat dishes)
4. **Review**: Check the detailed breakdown to see exactly who owes what

## 📱 Usage Examples

### Scenario 1: Mixed Restaurant Order

- **Individual**: Alice had 1 beer (₹250), Bob had 3 beers (₹750)
- **Shared**: Everyone splits the appetizer (₹450 ÷ 3 = ₹150 each)
- **Opt-out**: Vegetarian Charlie doesn't pay for chicken wings

### Scenario 2: Partial Items

- **Split dessert**: Alice and Bob each had 0.5 of a ₹300 cake (₹150 each)
- **Shared tax**: 18% GST split equally among all diners

## 🛠️ Technical Details

- **Technology**: Pure HTML, CSS, and JavaScript
- **No dependencies**: Works offline, no external libraries
- **Browser support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Responsive**: Works on desktop and mobile devices

## 📋 Project Layout

```
index.html        the static app (open it directly — works offline)
api/              Vercel serverless functions
  parse-receipt.js   POST: extracts items from a receipt image
  health.js          GET:  reports configured model
package.json      single dep: openai (used as the OpenRouter client)
```

The whole stack lives on **one Vercel deployment**: `index.html` is served as static, `api/*.js` are serverless functions on the same domain. No CORS, no second host, no extra env on the client.

## 🚀 Deploying to Vercel (free)

1. Push this repo to GitHub.
2. On <https://vercel.com>, click **Add New… → Project**, import the repo, accept the defaults (no build step).
3. In the project's **Settings → Environment Variables**, add:
   - `OPENROUTER_API_KEY` → your key from <https://openrouter.ai/keys>
   - `OPENROUTER_MODEL` *(optional)* → defaults to `google/gemini-2.5-flash`
   - `PUBLIC_APP_URL` *(optional)* → your deployed URL, used for OpenRouter attribution
4. Deploy. Future `git push`es auto-deploy.

Health check after deploy: `https://<your-deploy>.vercel.app/api/health` → `{ ok: true, model: "...", configured: true }`.

## 🧑‍💻 Running locally

The receipt-scan feature needs the API functions running locally too, which `vercel dev` handles:

```bash
npm install
npm install -g vercel        # one-time
vercel link                   # link this folder to your Vercel project
vercel env pull .env.local    # pulls OPENROUTER_API_KEY etc. from Vercel
npm run dev                   # starts vercel dev on http://localhost:3000
```

Or for the calculator only (no scanning), just open `index.html` in a browser — the bill-splitting math runs fully offline.

## 📸 Choosing a vision model

Defaults to `google/gemini-2.5-flash` — cheap, fast, good at receipt OCR. Set `OPENROUTER_MODEL` in Vercel env vars to swap. Any vision-capable OpenRouter model works:

- `anthropic/claude-sonnet-4.5` — best accuracy
- `openai/gpt-4o` — strong all-rounder
- `google/gemini-2.5-pro` — Gemini's flagship

Receipt photos are resized client-side to 1600px (long side) JPEG before upload — keeps payloads under Vercel's 4.5 MB body limit and reduces model latency without hurting OCR.

## 🌐 Pointing the frontend at a different backend

The frontend defaults to **same-origin** (no host needed). To point it elsewhere — for example, a separate Vercel project — set this before the main `<script>` block in `index.html`:

```html
<script>
  window.BILL_SPLITTER_BACKEND = "https://your-other-deploy.vercel.app"
</script>
```

## 🎨 Interface Guide

### Adding Items

- **Regular items**: Enter item name and unit price
- **Shared items**: Check the "Shared item" checkbox before adding

### Quantity Input

- **Individual items**: Use number inputs to set quantities per person
- **Shared items**: Use checkboxes to include/exclude people

### Visual Indicators

- 🔄 **Shared items**: Marked with a recycle icon
- ✅ **Included**: Green background for people included in shared items
- ❌ **Excluded**: Red background for people excluded from shared items

## 🤝 Contributing

Found a bug or have a feature request?

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 💡 Feature Ideas & Roadmap

- [ ] Export results to PDF/image
- [ ] Save/load bill templates
- [ ] Multi-currency support
- [x] Receipt photo parsing with OCR ✅ (via OpenRouter — model is one env-var swap)
- [ ] Group payment tracking over time
- [ ] Integration with payment apps (UPI, PayPal)

## 🐛 Known Issues

- Rounding may cause minor discrepancies with very small amounts
- Mobile keyboard behavior varies across devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for fair and transparent bill splitting
- Inspired by real-world dining scenarios and group expense challenges
- Designed with Indian dining culture and currency in mind

## 📞 Support

If you encounter any issues or have questions:

- Open an issue on GitHub
- Check existing issues for solutions
- Feel free to contribute improvements!

---

**Happy splitting!** 🍻 Make every group dinner fair and stress-free.
