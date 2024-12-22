import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/**
 * This function will search YouTube for videos and place them in a DynamoDB table
 */
export const newVideoWebhook = async () => {
  const tableName = process.env.TABLE_NAME;

  const dynamodbClient = new DynamoDBClient({
    retryStrategy: new AdaptiveRetryStrategy(() => Promise.resolve(10)),
  });
};
