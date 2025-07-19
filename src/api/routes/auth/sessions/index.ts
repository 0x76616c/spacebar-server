import { route } from "@spacebar/api";
import { User } from "@spacebar/util";
import { Router, Request, Response } from "express";
import { SessionsResponse } from "util/schemas/responses/SessionsResponse";

const router = Router();

router.get(
	"/",
	route({
		responses: {
			200: {
				body: "SessionsResponse",
			},
			401: {
				body: "APIErrorResponse",
			},
		},
	}),
	async (req: Request, res: Response) => {
		const user = await User.findOneOrFail({
			where: { id: req.user_id },
			relations: ["devices"],
		});

		const sessions = user.devices.map((device) => ({
			id_hash: device.id_hash,
			approx_last_used_time: device.last_used_time?.toISOString(),
			client_info: {
				os: device.os,
				platform: device.platform,
				location: device.location,
			},
		}));

		res.send({ user_sessions: sessions } as SessionsResponse);
	},
);

export default router;

// todo: somehow make it so that the current devices tab shows the current device..
