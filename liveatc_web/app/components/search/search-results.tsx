"use client"

import { useSearchStore } from '@/store/search-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SignalHigh, SignalLow } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';

export function SearchResults() {
  const { results, error } = useSearchStore();

  if (error || results.length === 0) return null;

  const airport = results[0]; // We're searching by ICAO so there's only one result

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>{airport.name} 
            <Badge className='text-yellow-300 text-sm'>{airport.icao}</Badge>
          </CardTitle>
          <CardDescription>
            {airport.city}, {airport.state_province}, {airport.country}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="font-mono bg-muted p-3 rounded-lg">
              METAR: {airport.metar || 'Not available'}
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                Available Audio Channels ({airport.audio_channels.length})
              </h3>
              <ScrollArea className="h-[600px] rounded-lg border">
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
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          console.log('Selected channel:', channel);
                        }}
                      >
                        <TableCell className="px-4 py-3 text-sm">{channel.name}</TableCell>
                        <TableCell className="px-4 py-3 text-sm font-mono">
                          {channel.frequencies.map(freq => 
                            typeof freq === 'object' && freq.frequency 
                              ? freq.frequency 
                              : freq
                          ).join(', ')}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center gap-1.5 relative z-0">
                            {channel.feed_status ? (
                              <div className="relative">
                                <SignalHigh className="w-4 h-4 text-green-600" />
                                <div className="absolute inset-0 animate-ping-slow rounded-full bg-green-400/20" />
                              </div>
                            ) : (
                              <SignalLow className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-xs font-medium ${
                              channel.feed_status 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {channel.feed_status ? 'Online' : 'Offline'}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 