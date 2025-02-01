import { Request } from '@/app/models/request';
import connectToDb from "@/app/lib/mongoose";

export async function GET(req: Request, { params }: {params: Promise<{transaction_id: string}>}) {
    await connectToDb();
    try {
        const {transaction_id} = await params;
        const request = await Request.findOne({ transactionId: transaction_id }) // Get data based on transaction id
        .select('status items.product_name items.product_price items.product_description -_id');
        if(request.status === 'processing') {
            return Response.json({
                code: 202,
                message: "Still processing. Please wait!"
            }, {
                status: 202
            })   
        } else if(request.status === 'failed') {
            return Response.json({
                code: 404,
                message: "Request failed. Please try scraping again!"
            }, {
                status: 404
            })
        }
        return Response.json({
            code: 200,
            message: "Ok",
            data: request.items
        });
    }   
    catch (error) { 
        console.error(error);
        return Response.json({
            code: 500,
            message: "Internal Server Error"
        }, {
            status: 500
        })
    }
}