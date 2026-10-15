# Bangladesh Real Estate Compliance, Legal & Taxation Engine

## 1. Bangladesh Land Measurement & Mathematical Conversion Rules

The ERP incorporates a configurable conversion engine reflecting standard Bangladesh Land Survey rules while allowing district-level parameter overrides:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STANDARD CONVERSIONS                            │
├───────────────────────┬───────────────────────┬────────────────────────┤
│ Unit                  │ Square Feet (Sq Ft)   │ Decimal (শতাংশ)        │
├───────────────────────┼───────────────────────┼────────────────────────┤
│ 1 Decimal (শতাংশ/শতক) │ 435.60 Sq Ft          │ 1.0000 Decimal         │
│ 1 Katha (কাঠা)        │ 720.00 Sq Ft          │ 1.6528 Decimal         │
│ 1 Bigha (বিঘা)        │ 14,400.00 Sq Ft       │ 33.0578 Decimal        │
│ 1 Acre (একর)          │ 43,560.00 Sq Ft       │ 100.0000 Decimal       │
│ 1 Square Metre        │ 10.7639 Sq Ft         │ 0.0247 Decimal         │
└───────────────────────┴───────────────────────┴────────────────────────┘
Note: 1 Bigha = exactly 20 Katha.
```

### Python Conversion Logic Implementation (`bd_land_converter.py`):
```python
class BangladeshLandConverter:
    SQFT_PER_DECIMAL = 435.60
    SQFT_PER_KATHA = 720.00
    KATHA_PER_BIGHA = 20.00
    SQFT_PER_ACRE = 43560.00

    @classmethod
    def from_sqft(cls, sqft: float) -> dict:
        decimal_val = sqft / cls.SQFT_PER_DECIMAL
        katha_val = sqft / cls.SQFT_PER_KATHA
        bigha_val = katha_val / cls.KATHA_PER_BIGHA
        acre_val = sqft / cls.SQFT_PER_ACRE
        return {
            "sqft": round(sqft, 2),
            "decimal": round(decimal_val, 4),
            "katha": round(katha_val, 4),
            "bigha": round(bigha_val, 4),
            "acre": round(acre_val, 4)
        }
```

---

## 2. Historic Bangladesh Survey Records & Khatian Hierarchy

In Bangladesh property due diligence, land title must be verified across sequential land surveys:

```
[ CS: Cadastral Survey (1888-1940) ]
               │
               ▼
[ SA: State Acquisition Survey (1956-1962) ]
               │
               ▼
[ RS: Revisional Survey (1965-1990) ]
               │
               ▼
[ BS / BRS / City Survey (1998 - Present) ]
               │
               ▼
[ Mutation Khatian (নামজারি ও জমাভাগ) + DCR + Tax Dakhila ]
```

### Document Verification Workflow:
1. **Chain of Ownership (বায়া দলিল)**: Chronological link from the recorded CS/SA owner to the current seller via registered sale deeds, gift deeds (হেবা), or partition deeds (বণ্টননামা).
2. **Mutation Khatian (নামজারি)**: Verification of AC Land approval, DCR (Duplicate Carbon Receipt), and up-to-date Land Development Tax (ভূমি উন্নয়ন কর দাখিলা).
3. **Non-Encumbrance Certificate (NEC)**: 12 to 30 years search report from the concerned Sub-Registry Office confirming absence of prior mortgages or fraudulent double sales.

---

## 3. Sub-Registry Registration Fee & Advance Income Tax (AIT) Calculator

When executing apartment deeds of transfer at the Sub-Registry Office, fees are calculated based on the Deed Value and Government Slabs:

### Statutory Charges Breakdown:
1. **Stamp Duty**: 1.5% of deed value (under Stamp Act).
2. **Registration Fee**: 1.0% of deed value.
3. **Local Government Tax**:
   - 2.0% within City Corporation / Cantonment Board areas.
   - 3.0% within Municipality / Pourashava areas.
4. **Gain Tax / AIT (Advance Income Tax) under Income Tax Act 2023**:
   - **Section 53FF (For Real Estate Developers)**: Flat rate per square metre based on location classification:
     * *Gulshan, Banani, Baridhara, Motijheel, Dilkusha*: ৳ ১,৬০০ to ৳ ৪,০০০ per sq metre.
     * *Dhanmondi, Uttara, Mohakhali, Lalmatia*: ৳ ১,২০০ to ৳ ৩,০০০ per sq metre.
     * *Other areas within Dhaka/Chittagong City Corporation*: ৳ ৮০০ to ৳ ১,৫০০ per sq metre.
     * *Other Municipalities & Rural areas*: ৳ ৩০০ to ৳ ৮০০ per sq metre.
   - **Section 53H (For Land Sellers / Landowners)**: Source tax on land transfers based on mouza-wise government minimum valuation.

---

## 4. Bangladesh VAT Engine (Value Added Tax and Supplementary Duty Act 2012)

### Residential Apartments:
- **Up to 1,600 Square Feet**: 2.0% VAT on total unit price.
- **Above 1,600 Square Feet**: 4.5% VAT on total unit price.
- **Re-registration of Used Apartments**: 1.5% VAT.

### Commercial Spaces & Shops:
- Standard rate: 7.5% to 15.0% depending on input tax credit (ITC) method.

### Mushak 6.3 Generation:
Upon collecting each installment or down payment, the system auto-generates the statutory **Mushak 6.3 Tax Invoice** recording developer BIN, buyer NID/TIN, gross amount, VAT rate, and net collected amount.

---

## 5. Negotiable Instruments Act 1881 Section 138 (Cheque Bounce Automation)

When a customer's Post Dated Cheque (PDC) is dishonored by the bank, the statutory legal clock starts:

```
[ Cheque Bounces at Bank ]
            │
            ▼ (Within 30 Days of Dishonour Memo)
[ Auto-Generate Statutory Legal Notice under Section 138 ]
- Issued via Registered Post with A/D (Acknowledgement Due)
- Demands payment within 30 days of notice receipt
            │
            ▼
┌───────────────────────────┴───────────────────────────┐
│ Client Pays within 30 Days?                           │
├───────────────────────────┬───────────────────────────┤
│ YES                       │ NO                        │
│ - Cheque cleared          │ - Offence is committed    │
│ - Penalties adjusted      │ - ERP notifies Legal Dept │
│ - Case closed             │ - Drafts CR Case for Court│
└───────────────────────────┴───────────────────────────┘
```

The system automatically tracks these statutory dates and prevents missing the strict 30-day legal windows.
