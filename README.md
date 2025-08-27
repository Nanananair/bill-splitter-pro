# 💰 Bill Splitter Pro

A smart, interactive web application for splitting bills fairly among friends, with support for individual quantities, shared items, and opt-out features.

## ✨ Features

### 🧮 Smart Splitting Options

- **Individual Items**: Track quantities per person (perfect for "I had 1 beer, you had 3")
- **Shared Items**: Split costs equally among selected people (taxes, appetizers, etc.)
- **Decimal Quantities**: Support for partial items (0.5 dessert, 0.33 pizza slice)
- **Opt-out Functionality**: Exclude people from specific shared items (vegetarians from non-veg dishes)

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

### Option 1: Download and Run Locally

```bash
# Clone the repository
git clone https://github.com/Nanananair/bill-splitter-pro.git

# Navigate to the directory
cd bill-splitter-pro

# Open in browser
open index.html
# or simply double-click the HTML file
```

### Option 2: Direct Usage

Simply download the HTML file and open it in any web browser. No server setup required!

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
- [ ] Receipt photo parsing with OCR
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
