import { Column, Entity, JoinColumn, ManyToOne, RelationId } from "typeorm";
import { BaseClass } from "./BaseClass";
import { dbEngine } from "../util/Database";
import { User } from "./User";
import { Request } from "express";
import { getIpAdress, IPAnalysis } from "@spacebar/api";
import { Snowflake } from "..";
import bcrypt from "bcrypt";

@Entity({
	name: "devices",
	engine: dbEngine,
})
export class Device extends BaseClass {
	@Column()
	id_hash: string; // either store it here on creation, or compute it when the user goes to sessions

	@Column({ nullable: true })
	last_used_time?: Date;

	@Column({ nullable: true })
	os?: string; // os in X-Super-Properties

	@Column({ nullable: true })
	platform?: string; // browser in X-Super-Properties

	@Column({ nullable: true })
	location?: string; // "City, State, Country" fetch from IP?

	@Column({ default: false })
	suspended: boolean = false; // this can be useful when instance moderations via account standing become a thing

	@Column({})
	@RelationId((device: Device) => device.user)
	user_id: string;

	@JoinColumn({ name: "user_id" })
	@ManyToOne(() => User, {
		onDelete: "CASCADE",
	})
	user: User;

	// returns device id
	static async createDevice({ req, user }: { req: Request; user: User }) {
		const location = await IPAnalysis(getIpAdress(req));

		let os: string, platform: string;

		if (req.headers["x-super-properties"]) {
			const decoded = Buffer.from(
				req.headers["x-super-properties"].toString(),
				"base64",
			).toString("utf-8");
			const client_info: ClientInfo = JSON.parse(decoded);
			os = client_info.os;
			platform = client_info.browser;
		} else {
			const ua = (req.headers["user-agent"] ?? "").toLowerCase();
			os = ua.includes("windows") // ! evil ifs
				? "Windows"
				: ua.includes("mac os")
					? "macOS"
					: ua.includes("linux")
						? "Linux"
						: ua.includes("android")
							? "Android"
							: ua.includes("iphone") || ua.includes("ipad")
								? "iOS"
								: "Unknown";

			platform = ua.includes("edg/")
				? "Edge"
				: ua.includes("chrome") && !ua.includes("edg/")
					? "Chrome"
					: ua.includes("safari") && !ua.includes("chrome")
						? "Safari"
						: ua.includes("firefox")
							? "Firefox"
							: ua.includes("opera") || ua.includes("opr/")
								? "Opera"
								: "Unknown";
		}

		const id = Snowflake.generate();

		const location_string = `${location.city}, ${location.region}, ${location.country_name}`;

		await Device.insert({
			id,
			id_hash: Buffer.from(await bcrypt.hash(id.toString(), 12)).toString(
				"base64",
			),
			last_used_time: new Date(),
			os,
			platform,
			location: location.country_name ? location_string : "Unknown",
			suspended: false,
			user: user,
		});

		return id;
	}

	static async resetDevices({ req, user }: { req: Request; user: User }) {
		await Device.delete({ user_id: req.user_id });

		return await this.createDevice({ req, user });
	}
}

export interface ClientInfo {
	os: string;
	browser: string;
	device: string;
	system_locale: string;
	has_client_mods: boolean;
	browser_user_agent: string;
	browser_version: string;
	os_version: string;
	referrer: string;
	referring_domain: string;
	referrer_current: string;
	referring_domain_current: string;
	release_channel: string;
	client_build_number: number;
	client_event_source: string | null;
	client_launch_id: string;
	launch_signature: string;
	client_app_state: string;
}
