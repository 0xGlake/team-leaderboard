import {
	BigNum,
	BN,
	BulkAccountLoader,
	ClearingHouse,
	ClearingHouseUser,
	Wallet,
	PerpMarkets,
	SpotMarkets,
	initialize,
} from '@drift-labs/sdk';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

let teamAddys = new Map<string, string>([
	["GLAKETtJHrTwiDiZmPuNsW8RCfynobP2yKjyJMokJjVn", "Member 1"],
	["wi118WNNuZGLqgrznHDwzDnHKKmMCQmCyDGQCMRbZdj", "Member 2"],
	["6aiE94djwgR72ozpDfFUdcSCpCuVAxkxTArWmfyzay6d", "Member 3"],
	["i8M6Rm9DcFzRhiLFrXsMF8H3hrkBwvEhGUzFQAH3PLa", "Member 4"],
	["6sAaRdVhuuogN6Csr8r7sXpivhYBYjhcz9eNL3mhYTRR", "Member 5"],
	["CrisPtzi6bzU8z654QkRbr6S3wiUG1rY6MShpdKhKoHv", "Member 6"],
	["x19zhryYtodTDgmRq6VLtQxbo4zfZUqa9hoobX47BeL", "Member 7"],
	["29iErmt6WbsEVmE6Rm1HGRaor6b2kxxHrejPKrcbe37n", "Member 8"],
	["niCk6QHFU1kyU56Mdq5RJzKrecdkNSn23ZA6wduFdWS", "Member 9"],
	["3gXdi65BunRF2ZirJKMYcga2TAb5HgPZzkCBTqegro2u", "Member 10"],
	["LUKEsMb7fu64BVHStVfNB4DisR6g62wfq7mgjqymepp", "Member 11"],
	["dWe7eT2mHkWgbhSNtBVN89sYAPNGFNvuHQXVUq2wh7N", "Member 12"],
	["AhyqQnpZZqn3YTxeYhUx3ZA6RrZm5yLJGabDbzZ5BPNF", "Member 13"],
	["BiGZJeWeQv9arWQ38vwTzb4SF8DoQ5GdCqNUrSKmqWRy", "Member 14"],
	["9jMAUgoiHZXsoGomc6NFTvarZojxpNJPtz816zq2gQM6", "Member 15"],
	["2tdWByK1xSQVEhbYydxAxt3mR2uorjvM1Rk5NzrPKyb3", "Member 16"],
	["HCcUvWgSkb6UevUPcvUiuhUAefXgfGyppxK9tY434FPv", "Member 17"],
	["LUiqSfUDMLWncsE1wfZGWr5hnv6V3WmWLW2XyKPctcS", "Member 18"]
]);

let teamLeaderboard = new Map<string, number>();

export async function processLeaderboard(
	connection: Connection,
	clearingHouse: ClearingHouse
	) {
		
		if (!clearingHouse.isSubscribed) {
			await clearingHouse.subscribe();
		}
		
		const programUserAccounts = (await clearingHouse.program.account.user.all()) as any[];
		
		const userAccountLoader = new BulkAccountLoader(connection, 'processed', 0);
		
		const userArray: ClearingHouseUser[] = [];
		
		for (const programUserAccount of programUserAccounts) {
			const user = new ClearingHouseUser({
				accountSubscription: {
					type: 'polling',
					accountLoader: userAccountLoader,
				},
				clearingHouse: clearingHouse,
				userAccountPublicKey: programUserAccount.publicKey,
			});
			userArray.push(user);
		}
		
		await Promise.all(userArray.map((user) => user.subscribe()));
		
		console.log(
			`Found ${userArray?.length} accounts`
		);
		
		for (const user of userArray) {
			if (!user.isSubscribed) {
				await user.subscribe();
			}
			if (!user.accountSubscriber.isSubscribed) {
				await user.accountSubscriber.subscribe();
			}

			let totalPNL = user.getBankAssetValue().add(user.getBankLiabilityValue()).add(user.getUnrealizedPNL());
			
			if (teamAddys.has(user.getUserAccount().authority.toString())){
				console.log("Team member ", teamAddys.get(user.getUserAccount().authority.toString()));
				teamLeaderboard.set(teamAddys.get(user.getUserAccount().authority.toString()) as string, totalPNL.toString(10)/(1000000));
			} else {
				console.log("pubkey: " + user.getUserAccount().authority + " has " + totalPNL.toString(10)/(1000000));
			}
		}

		const mapSort1 = new Map([...teamLeaderboard.entries()].sort((a, b) => b[1] - a[1]));
		
		for (let [key, value] of mapSort1) {
			console.log(key + " has " + value);
		}
		console.log(mapSort1);
	}


// load default config
const dotenv = require('dotenv');
dotenv.config();

const env = process.env.ENV;
console.log(`Using Endpoint: ${process.env.ENDPOINT}`);

const wallet = new Wallet(new Keypair());
const endpoint = process.env.ENDPOINT as string;
const connection = new Connection(endpoint, 'recent');

export const CONNECTION = { connection };

//@ts-ignore
const sdkConfig = initialize({ env: env });
//InitializeCommon(process.env.ENV as DriftEnv);

const clearingHouseProgramId = new PublicKey(
	sdkConfig.CLEARING_HOUSE_PROGRAM_ID
);

console.log(`Using Program ID ${sdkConfig.CLEARING_HOUSE_PROGRAM_ID}`);

const clearingHouse = new ClearingHouse({
	connection,
	wallet,
	programID: clearingHouseProgramId,
	perpMarketIndexes: PerpMarkets[sdkConfig.ENV].map((mkt) => mkt.marketIndex),
	spotMarketIndexes: SpotMarkets[sdkConfig.ENV].map((mkt) => mkt.marketIndex),
	oracleInfos: PerpMarkets[sdkConfig.ENV].map((mkt) => {
		return { publicKey: mkt.oracle, source: mkt.oracleSource };
	}),
});

clearingHouse
	.subscribe()
	.then(() => {
		console.log('clearing house successfully subscribed');
	})
	.catch(() => {
		console.log('clearing failed to subscribe');
	});

processLeaderboard(connection, clearingHouse);
