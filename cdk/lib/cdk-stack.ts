import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "gbuTable", {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Missing Google API key from env vars.");
    }

    const searchListLambda = new nodejs.NodejsFunction(
      this,
      "vgcYTSearchHandler",
      {
        description: "Populates a table with search results from YouTube",
        entry: path.join(__dirname, "./lambda/yt-search.ts"),
        handler: "searchList",
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: cdk.Duration.minutes(15),
        environment: {
          TABLE_NAME: table.tableName,
          GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        },
        bundling: {},
      }
    );

    table.grantWriteData(searchListLambda);
  }
}
