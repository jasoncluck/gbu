import { youtube } from "@googleapis/youtube";

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { AdaptiveRetryStrategy } from "@aws-sdk/util-retry";

type ChannelName = "nextlander" | "giantbomb" | "remap";

interface ChannelInfo {
  id: string;
  uploadPlaylistId: string;
}

export const CHANNELS: Record<ChannelName, ChannelInfo> = {
  nextlander: {
    id: "UCO0gHyqLNeIrCAjwlO2BmiA",
    uploadPlaylistId: "UUO0gHyqLNeIrCAjwlO2BmiA",
  },
  giantbomb: {
    id: "UCmeds0MLhjfkjD_5acPnFlQ",
    uploadPlaylistId: "UUmeds0MLhjfkjD_5acPnFlQ",
  },
  remap: {
    id: "UCpcSq3A3Z4tUJsHKfn8zpnA",
    uploadPlaylistId: "UUpcSq3A3Z4tUJsHKfn8zpnA",
  },
} as const;

/**
 * This function will search YouTube for videos and place them in a DynamoDB table
 */
export const searchList = async () => {
  const tableName = process.env.TABLE_NAME;

  const dynamodbClient = new DynamoDBClient({
    retryStrategy: new AdaptiveRetryStrategy(() => Promise.resolve(10)),
  });

  const youtubeClient = youtube({
    version: "v3",
    auth: process.env.GOOGLE_API_KEY,
  });

  for (const [channelName, channelInfo] of Object.entries(CHANNELS)) {
    let pageToken: string | null | undefined;
    do {
      const { data } = await youtubeClient.playlistItems.list({
        part: ["id", "snippet", "contentDetails"],
        playlistId: channelInfo.uploadPlaylistId,
        maxResults: 50,
        ...(pageToken && { pageToken }),
      });

      const { nextPageToken, items } = data;

      if (!items) {
        throw new Error(`No items found for: ${channelName}, stopping. `);
      }
      for (const item of items) {
        if (item.contentDetails?.videoId && item.snippet?.title) {
          await dynamodbClient.send(
            new PutItemCommand({
              TableName: tableName,
              Item: {
                id: { S: item.contentDetails?.videoId },
                channel: { S: channelName },
                title: { S: item.snippet?.title },
                ...(item.snippet.publishedAt && {
                  publishedAt: { S: item.snippet?.publishedAt },
                }),
                ...(item.etag && {
                  etag: { S: item.etag },
                }),
                ...(item.snippet.thumbnails?.maxres?.url && {
                  thumbnailMaxResUrl: {
                    S: item.snippet.thumbnails.maxres?.url,
                  },
                }),
                ...(item.snippet.thumbnails?.default?.url && {
                  thumbnailUrl: { S: item.snippet.thumbnails.default?.url },
                }),
                ...(item.snippet.description && {
                  description: { S: item.snippet.description },
                }),
              },
            })
          );
          console.log(
            `Stored id: ${item.id}, title: ${item.snippet.title}, paginationToken: ${nextPageToken}`
          );
        }
      }
      pageToken = nextPageToken;
    } while (pageToken);
  }
};
