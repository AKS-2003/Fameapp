import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/database/mongodb";
import { ArtistDocumentModel } from "@/database/models/FameLinkModels";

export async function GET(
	request: NextRequest,
	{ params }: { params: { artistId: string } }
) {
	try {
		const { artistId } = await Promise.resolve(params);
		await connectToDatabase();

		let doc = await ArtistDocumentModel.findOne({ artistId }).lean();
		if (!doc) {
			doc = { artistId, files: [], contractDetails: {} };
		}

		return NextResponse.json({ success: true, data: doc });
	} catch (error) {
		console.error("Error fetching artist documents:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch documents" },
			{ status: 500 }
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { artistId: string } }
) {
	try {
		const { artistId } = await Promise.resolve(params);
		const payload = await request.json();

		await connectToDatabase();

		const updateData: any = {
			updatedAt: new Date().toISOString()
		};

		if (payload.contractDetails !== undefined) {
			updateData.contractDetails = payload.contractDetails;
		}

		if (payload.files !== undefined) {
			updateData.files = payload.files;
		}

		const updatedDoc = await ArtistDocumentModel.findOneAndUpdate(
			{ artistId },
			{ 
				$set: updateData,
				$setOnInsert: {
					id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					createdAt: new Date().toISOString()
				}
			},
			{ new: true, upsert: true, lean: true }
		);

		return NextResponse.json({ success: true, data: updatedDoc });
	} catch (error) {
		console.error("Error updating artist documents:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update documents" },
			{ status: 500 }
		);
	}
}
