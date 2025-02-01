# Technical Test MrScraper - Junianto Ichwan Dwi Wicaksono

### Project Requirements

1. To run this app make sure you have node version 20, mongodb, git installed on your computer.

2. Make sure you have already registered an account on Groq. If not, please register at https://console.groq.com first.

3. Open your terminal and clone this repo using the following command:

```bash
git clone https://github.com/juniantowicaksono06/mrscrapper-technical-test
```

4. After you clone the repo you can install the required package for the project using

```bash
npm install # If you use npm
yarn install # If you use yarn
bun install # If you use bun
```

5. Rename or copy the .env.example to .env and make sure to configure it correctly
```bash
EBAY_BASE_URL=https://www.ebay.com/
GROQ_API_KEY="<YOUR_GROQ_API_KEY>" # REGISTER YOUR GROQ API KEY IN https://console.groq.com/login

MONGODB_URI="<MONGODB_URI>"

PUPPETEER_HEADLESS=false # Change to true to run in headless mode

EBAY_MAX_PAGINATION=2 # MAXIMUM PAGINATION
```

6. You can run the project using the command
```bash
npm run dev # If you use npm
yarn dev # if you use yarn
bun run dev # if you use bun
```

## API Docs
- [Base Url](#url)
- [Endpoints](#endpoints)
    - [POST /api/scraping/ebay?search=search-product](#post-scraping-ebay)
    - [GET /api/retrieve/:transaction_id](#get-retrieve-products)

## URL
- **Base Url:** http://localhost:3000

## Endpoints
### **POST /scraping-ebay**
- **Description:** Perform scrapping
- **URL:** `/api/scraping/ebay`
- **Headers:**
    - `Content-Type: application/json`
- **Method:** `POST`
- **Body:**
```json
{
    "search": "PS5"
}
```
- **Response Success:**
```json
{
    "code": 200,
    "message": "OK",
    "data": {
        "transaction_id": "8eab3da7-8361-4ad4-b295-6f2be9a679a1"
    }
}
```
- **HTTP Response Success:** `200`

- **Response Error:**
```json
{
    "code": 500,
    "message": "Internal server error!"
}
```
- **HTTP Response Error:** `500`

### **GET /retrieve-products**

- **Description:** Retrieve the products after scraping is finished
- **URL:** `/api/retrieve/:transaction_id`
- **Method:** `GET`
- **Response Success:**
```json
{
    "code": 200,
    "message": "Ok",
    "data": [
        {
            "product_name": "Xbox One Console + Genuine Controller + Kinect Compatible + Cables",
            "product_price": "IDR1,814,782.37",
            "product_description": "This Xbox One Console Bundle is in great condition, sold as pictured, with every single button tested and working perfectly. It includes the Xbox One 500gb Console, Xbox One Controller, Power Supply, Power Cable, and HDMI Cable. All orders are packed and shipped within the same business day. Postage cost details are available in the Postage tab. The item is available for pick-up. Handling time is the same business day. Combine postage is available upon request. Payment methods include PayPal, Google Pay, Visa/Mastercard/American Express, Afterpay, and Bank Deposit. Refund policy requires items to be returned within 30 days in original packaging and condition, with the buyer responsible for return postage costs.",
            "_id": "679e6d9570f3f7e99194ceac"
        },
        {
            "product_name": "Xbox One Gold Excellent Condition",
            "product_price": "IDR1,182,666.87",
            "product_description": "Console recently refurbished with internal cleaning and thermal paste replaced. Selling only the console. Shipping possible at buyer's expense with insurance covering the full amount.",
            "_id": "679e6d9970f3f7e99194ceae"
        }
    ]
}
```
- **HTTP Response Success:** `200`
- **Response Still Processing:**
```json
{
    "code": 202,
    "message": "Still processing. Please wait!"
}
```
- **HTTP Response Still Processing:** `202`


- **Response Error:**
```json
{
    "code": 500,
    "message": "Internal server error!"
}
```
- **HTTP Response Error:** `500`