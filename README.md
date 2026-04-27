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

## 📋 Installation & Setup

The repo is a small monorepo:

```
frontend/   static HTML/CSS/JS — open in any browser
backend/    optional Node service for receipt scanning
```

### Option 1: Just the calculator (no setup)

Open `frontend/index.html` in any browser. The bill-splitting calculator works fully offline — only the receipt-scan feature needs the backend.

### Option 2: Run locally with receipt scanning

```bash
git clone https://github.com/Nanananair/bill-splitter-pro.git
cd bill-splitter-pro
npm install

# Add your OpenRouter key (get one at https://openrouter.ai/keys)
cp backend/.env.example backend/.env
# edit backend/.env and paste sk-or-...

# Start the backend
npm run start:backend
# health check: http://localhost:3001/api/health

# In another terminal, serve the frontend
cd frontend && python3 -m http.server 8080
# open http://localhost:8080
```

### 📸 Choosing a vision model

The backend defaults to `google/gemini-2.5-flash` — cheap, fast, and good at receipt OCR. To swap, set `OPENROUTER_MODEL` in `backend/.env`. Any vision-capable model on OpenRouter works:

- `anthropic/claude-sonnet-4.5` — best accuracy
- `openai/gpt-4o` — strong all-rounder
- `google/gemini-2.5-pro` — Gemini's flagship

### 🌐 Pointing the deployed frontend at a remote backend

By default the frontend talks to `http://localhost:3001`. To override (e.g. on GitHub Pages), inject this before the main `<script>` block in `frontend/index.html`:

```html
<script>
  window.BILL_SPLITTER_BACKEND = "https://your-backend.example.com"
</script>
```

### 🚀 Deployment

- **Frontend**: pushed to `master`/`main` is auto-deployed to GitHub Pages from `frontend/` via `.github/workflows/deploy-pages.yml`. Enable Pages → "Source: GitHub Actions" once in repo settings.
- **Backend**: not auto-deployed (requires `OPENROUTER_API_KEY` as a secret). Deploy to Render / Railway / Fly.io and set `ALLOWED_ORIGIN` to your Pages URL.

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
