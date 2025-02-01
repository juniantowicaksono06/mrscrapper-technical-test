import { NextRequest } from "next/server";
import puppeteer, { type Browser } from "puppeteer";
import { extractJSON } from "@/app/lib/utils";
import { extractData } from "@/app/lib/ai";
import { v4 as uuidv4 } from 'uuid';
import { Request } from '@/app/models/request';
import connectToDb from "@/app/lib/mongoose";

export async function POST(req: NextRequest) {
    await connectToDb();
    const transactionId = uuidv4();
    const message = "OK";
    // const search = url.searchParams.get("search");
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
        ebayScraping(search, transactionId);
        const newReq = new Request({
            transactionId: transactionId,
            searchQuery: search,
            status: "processing",
            items: [],
        });
        await newReq.save();
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
        await page.waitForSelector('#gh-ac-wrap');
        await page.click('#gh-ac-wrap > input');
        await page.keyboard.type(search);
        await page.keyboard.press('Enter');
        await page.waitForSelector('#srp-river-results');
        for(let i = 0; i < maxPagination; i++) {
            const lis = await page.$$('ul.srp-results > li[data-viewport]');
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
    
                const newPageTarget = await browser?.waitForTarget(target => target.opener() === page.target());
                const newPage = await newPageTarget?.page();
    
                if (newPage) {
                    await newPage.bringToFront();
                    await newPage.waitForSelector('#desc_ifr');
                    const iframeUrl = await newPage.evaluate(() => {
                        const iframe = document.getElementById('desc_ifr') as HTMLIFrameElement;
                        return iframe ? iframe.src : null;
                    });
    
                    if (iframeUrl) {
                        await newPage.goto(iframeUrl, {
                            waitUntil: 'domcontentloaded'
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
                            )
                        }
                        catch(error) {
                            console.error(error);
                        }
                        await newPage.close();
                    }
                }
            }
            const nextButton = await page.$('div.s-pagination__container a.pagination__next');
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
                log: "Scraping Success"
            }
        })
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
        })
    }
    finally {
        if (browser !== undefined) {
            await browser.close();
        }
    }
}