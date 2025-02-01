import { NextRequest } from "next/server";
import puppeteer, { type Browser } from "puppeteer";
import { extractJSON } from "@/app/lib/utils";
import { extractData } from "@/app/lib/ai";
import { v4 as uuidv4 } from 'uuid';
import { Request } from '@/app/models/request';
import connectToDb from "@/app/lib/mongoose";

export async function POST(req: NextRequest) {
    await connectToDb();
    const transactionId = uuidv4(); // Generate transaction id to associate with request
    const message = "OK";
    let search = "";
    try {
        const data = await req.json();
        search = data.search;
    }
    catch(error) {
        console.error(error);
    }
    if (search === null || search === "") {
        return Response.json({
            code: 400,
            message: "Bad Request"
        }, {
            status: 400
        });
    }


    try {
        ebayScraping(search, transactionId); // Run scraping as asynchronous operation so that it doesn't block the main thread
        const newReq = new Request({
            transactionId: transactionId,
            searchQuery: search,
            status: "processing",
            items: [],
        });
        await newReq.save(); // Insert the request into the database
    } catch (error) {
        console.error(error);
        return Response.json({
            code: 500,
            message: "Internal server error!"
        }, {
            status: 500
        });
    }

    return Response.json({
        code: 200,
        message: message,
        data: {
            transaction_id: transactionId
        }
    });
}

// Function to scrape ebay
const ebayScraping = async(search: string, transactionId: string) => {
    const baseUrl = process.env.EBAY_BASE_URL as string;
    let browser: Browser | undefined = undefined;
    try {
        const headless: boolean = process.env.PUPPETEER_HEADLESS === "false" ? false : true;
        browser = await puppeteer.launch({
            headless: headless,
        });
        const maxPagination = parseInt(process.env.EBAY_MAX_PAGINATION as string);
        const page = await browser.newPage();
        await page.goto(baseUrl);
        // Using the search bar to search product
        await page.waitForSelector('#gh-ac-wrap');
        await page.click('#gh-ac-wrap > input');
        await page.keyboard.type(search);
        await page.keyboard.press('Enter');
        await page.waitForSelector('#srp-river-results');
        for(let i = 0; i < maxPagination; i++) { // Loop the page to get all items base on maxPagination
            const lis = await page.$$('ul.srp-results > li[data-viewport]'); // Select all <li> elements that has data-viewport attribute
            for (const li of lis) {
                let item = await li.evaluate((el) => {
                    const allElements = el.cloneNode(true) as HTMLElement;
                    return Array.from(allElements.querySelectorAll<HTMLElement>('*'))
                        .map(
                            el => {
                                if (el.innerText) {
                                    return el.innerText;
                                }
                                return "";
                            }
                        )
                        .filter(text => text.length > 0) // Remove empty texts
                        .join('\n');
                });
    
                await li.evaluate((el) => {
                    const l = el.querySelector('div.s-item__title') as HTMLElement;
                    if (l) {
                        l.click();
                    }
                });
    
                const newPageTarget = await browser?.waitForTarget(target => target.opener() === page.target()); // Open detail product to get description
                const newPage = await newPageTarget?.page();
    
                if (newPage) {
                    await newPage.bringToFront();
                    await newPage.waitForSelector('#desc_ifr');
                    // The description is within the iframe so need to access get the URL from the iframe first to access the page and get the description!
                    const iframeUrl = await newPage.evaluate(() => {
                        const iframe = document.getElementById('desc_ifr') as HTMLIFrameElement;
                        return iframe ? iframe.src : null;
                    });
    
                    if (iframeUrl) {
                        await newPage.goto(iframeUrl, {
                            waitUntil: 'domcontentloaded' // Do not wait until the page is fully loaded
                        });
                        let description = "";
                        try {
                            await newPage.waitForSelector('div.x-item-description-child');
                            description = await newPage.evaluate(() => {
                                const description = document.querySelector('div.x-item-description-child') as HTMLElement;
                                return Array.from(description.querySelectorAll<HTMLElement>('*'))
                                    .map(el => {
                                        if (el.innerText) {
                                            return el.innerText;
                                        }
                                        return "";
                                    })
                                    .filter(text => text.length > 0) // Remove empty texts
                                    .join('\n');
                            });
                        }
                        catch(error) {
                            console.error(error);
                        }
    
                        item += `\ndescription: ${description}`;
                        try {
                            const productJson = await extractData(item);
                            const obj = extractJSON(productJson as string);
                            await Request.updateOne(
                                {
                                    transactionId: transactionId
                                },
                                {
                                    $push: {
                                        items: obj
                                    }
                                }
                            ); // Only push items when deepseek successfully extracted the text into json
                        }
                        catch(error) {
                            console.error(error);
                        }
                        await newPage.close();
                    }
                }
            }
            const nextButton = await page.$('div.s-pagination__container a.pagination__next'); // Next button to access next page
            if(nextButton) {
                await nextButton.click();
                await page.waitForSelector('#srp-river-results');
            }
        }
        await Request.updateOne({
            transactionId: transactionId,
        }, {
            $set: {
                status: "success",
                log: "Scraping Successfully"
            }
        }); // Update status to success once the scraping is done
    }
    catch(error) {
        console.error(error);
        Request.updateOne({
            transactionId: transactionId,
        }, {
            $set: {
                status: "failed",
                log: error
            }
        }); // Update status to failed if there is an error
    }
    finally {
        if (browser !== undefined) {
            await browser.close(); // Close the browser
        }
    }
}