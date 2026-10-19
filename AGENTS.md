# BlueOceans Real Estate ERP — Agent Rules & Token Optimization Guide

## 1. Project Stack & Architecture
- **Backend**: Python + FastAPI with SQLAlchemy Async ORM (`backend/`)
  - API Prefix: `/api`
  - Database: MySQL with async connection pool (`app.core.database`)
- **Frontend**: Angular 19+ Standalone Components + Tailwind CSS (`frontend/`)
  - Dev Server: `http://localhost:4200`
  - Component Library: Reusable custom components (`SearchableSelectComponent`, `CardContainerComponent`, `ModalComponent`, etc.)
- **Localization**: Bangladesh standards (BDT ৳ currency, Lakh/Crore formatting, BD tax/VAT Mushak).

---

## 2. Token Saving & Efficiency Rules (টোকেন সাশ্রয়ের চূড়ান্ত নিয়মাবলী)

### A. Context & File Reading (ফাইল পড়ার ক্ষেত্রে টোকেন বাঁচানো)
1. **No Gigantic File Dumps:** কখনই সম্পূর্ণ বড় ফাইল (`view_file` দিয়ে শত শত লাইন) একসাথে রিড করবেন না। শুধুমাত্র প্রয়োজনীয় ৫০-১০০ লাইনের রেঞ্জ (`StartLine`, `EndLine`) দেখুন।
2. **Targeted Search First:** কোনো কোড খোঁজার জন্য ডিরেক্টরি ব্রাউজ না করে সুনির্দিষ্ট `grep_search` ব্যবহার করুন।
3. **No Unsolicited Analysis:** ব্যবহারকারী যা চেয়েছেন তার বাইরের কোনো ফাইল, ডিরেক্টরি বা মডিউল নিজ থেকে এক্সপ্লোর বা অ্যানালাইজ করবেন না।
4. **Browser Subagent Strictly OFF:** ব্রাউজার সাব-এজেন্ট চালানো যাবে না (এটি প্রচুর টোকেন ও ব্যান্ডউইথ খরচ করে)।

### B. Code Editing & Modifications (কোড এডিট করার ক্ষেত্রে)
1. **Targeted Precision Edits:** পুরো ফাইল প্রতিস্থাপন না করে শুধুমাত্র সংশ্লিষ্ট অংশটুকু `replace_file_content` দিয়ে এডিট করুন।
2. **No Redundant Files/Recreations:** ইতোমধ্যে বিদ্যমান সার্ভিস, মডেল বা কম্পোনেন্ট দ্বিতীয়বার তৈরি করবেন না।
3. **Zero Waste Build Logs:** বড় কমান্ড চালানোর সময় অতিরিক্ত লগ আউটপুট যাতে কনটেক্সট উইন্ডো ফ্লাড না করে তা খেয়াল রাখুন।

### C. Response & Communication (উত্তরে টোকেন বাঁচানো)
1. **Ultra-Concise Responses:** উত্তর হবে সম্পূর্ণ কাজের ওপর ভিত্তি করে অতি সংক্ষিপ্ত, পয়েন্ট-টু-পয়েন্ট ও স্পষ্ট (বাজে বা অপ্রয়োজনীয় ভূমিকা, শুভেচ্ছা বা চাটুকারিতামূলক কথা সম্পূর্ণ নিষিদ্ধ)।
2. **No Unrequested Plans/Artifacts:** ব্যবহারকারী সরাসরি নির্দেশ না দিলে কোনো দীর্ঘ মার্কডাউন প্ল্যান, ড্রাফট বা আর্টফ্যাক্ট তৈরি করবেন না। সরাসরি কাজ সম্পাদন করুন।
3. **No Code Duplication in Chat:** ফাইলে যে কোড লেখা হয়েছে তা চ্যাটে পুনরায় বড় কোডব্লকে কপি-পেস্ট করবেন না; শুধু ফাইলের লিংক ও মূল পরিবর্তন উল্লেখ করুন।
4. **Language:** ব্যবহারকারীর প্রশ্নের ভাষা অনুযায়ী সরাসরি সংক্ষিপ্ত বাংলা অথবা ইংরেজিতে উত্তর দিন।

---

## 3. UI & Development Standards
1. **Dynamic Dropdowns:** কোনো হার্ডকোডেড সিলেক্ট অপশন থাকবে না; সকল ড্রপডাউন ডাইনামিক এবং `<app-searchable-select>` ব্যবহার করবে।
2. **Double-Entry Financial Safeguard:** প্রতিটি অ্যাকাউন্টিং লেনদেনে strictly enforce করতে হবে `Sum(Debit) == Sum(Credit)`।
3. **Audit Traceability:** ড্যাশবোর্ড ও রিপোর্টের প্রতিটি সংখ্যা তার মূল ভাউচার ও জার্নাল এন্ট্রির সাথে ড্রিল-ডাউন লিংকে যুক্ত থাকবে।
