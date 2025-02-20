"use client";

import { useSearchStore } from "@/store/search-store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";

export function SearchResults() {
  const { results, error, setFocusChannel } = useSearchStore();

  if (error || results.length === 0) return null;

  const airport = results[0]; // We're searching by ICAO so there's only one result

  return (
      <Card className="w-full max-w-[1200px] mx-auto space-y-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {airport.name}
            <Badge className="text-yellow-300 text-sm">{airport.icao}</Badge>
          </CardTitle>
          <CardDescription>
            {airport.city}, {airport.state_province}, {airport.country}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div className="font-mono bg-muted p-3 rounded-lg">
              METAR: {airport.metar || "Not available"}
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                Available Audio Channels ({airport.audio_channels.length})
              </h3>
              <div className="h-[600px] rounded-lg border overflow-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Frequencies</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {airport.audio_channels.map((channel) => (
                      <TableRow
                        key={channel.name}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="px-4 py-3 text-sm group/row">
                          <div className="flex items-center gap-2 relative">
                            <div className="absolute left-0 opacity-0 group-hover/row:opacity-100 transition-all duration-200 -translate-x-6 group-hover/row:translate-x-0">
                              <div
                                className={channel.feed_status ? 'cursor-pointer' : 'cursor-not-allowed'}
                                onClick={() => {
                                  if (!channel.feed_status) return;
                                  setFocusChannel(channel);
                                }}
                              >
                                <Play className={`size-4 text-primary ${!channel.feed_status && 'text-gray-500/40'}`} />
                              </div>
                            </div>
                            <span className="transition-transform duration-200 group-hover/row:translate-x-6">
                              {channel.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-mono">
                          {channel.frequencies
                            .map((freq) =>
                              typeof freq === "object" && freq.frequency
                                ? freq.frequency
                                : freq,
                            )
                            .join(", ")}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center gap-2 relative z-0">
                            <div className="flex gap-0.5">
                              <div
                                className={`size-2 rounded-full ${channel.feed_status ? "bg-green-500 status-online-1" : "bg-red-500 status-offline"}`}
                              ></div>
                              <div
                                className={`size-2 rounded-full ${channel.feed_status ? "bg-green-500 status-online-2" : "bg-red-500 status-offline"}`}
                              ></div>
                            </div>
                            <span
                              className={`text-xs font-medium ${channel.feed_status ? "text-green-600" : "text-red-600"}`}
                            >
                              {channel.feed_status ? "Online" : "Offline"}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
