import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchResponses, 
  saveResponse as saveResponseApi, 
  deleteResponseApi,
  fetchLocations,
  saveLocation as saveLocationApi,
  deleteLocationApi,
  fetchUserPrivilegesAdmin,
  saveUserPrivilegesAdmin
} from "@/lib/adminApi";
import type { ResponseData, Location, UserPrivileges } from "@/types/admin";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Save, MessageSquare, Shield, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import InteractiveMap from "@/components/InteractiveMap";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logout } = useAuth();

  const DEFAULT_PRIVILEGES: UserPrivileges = {
    chatEnabled: true,
    audioInputEnabled: true,
    mapAccessEnabled: true,
    autoTranslateEnabled: true
  };
  
  // --- Filter States ---
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // --- Responses Query ---
  const { data: responses = [] } = useQuery({
    queryKey: ["responses"],
    queryFn: fetchResponses
  });

  // --- Locations Query ---
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations
  });

  // --- User Privileges Query ---
  const { data: fetchedPrivileges } = useQuery({
    queryKey: ["userPrivileges"],
    queryFn: fetchUserPrivilegesAdmin
  });

  const [privileges, setPrivileges] = useState<UserPrivileges>(DEFAULT_PRIVILEGES);

  useEffect(() => {
    if (fetchedPrivileges) {
      setPrivileges(fetchedPrivileges);
    }
  }, [fetchedPrivileges]);

  // --- Filter Logic ---
  const filteredResponses = responses.filter(response => {
    const matchesCategory = categoryFilter === "all" || response.category === categoryFilter;
    const matchesSearch = searchTerm === "" || 
      (response.intent && response.intent.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (response.category && response.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // --- Get Unique Categories ---
  const categories = Array.from(new Set(responses.map(r => r.category).filter(Boolean)));

  // --- Mutations ---
  const saveResponseMutation = useMutation({
    mutationFn: (response: ResponseData) => saveResponseApi(response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      toast({ title: "Response Saved", description: "The chatbot response has been updated." });
    }
  });

  const deleteResponseMutation = useMutation({
    mutationFn: (intent: string) => deleteResponseApi(intent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      toast({ title: "Response Deleted", variant: "destructive" });
    }
  });

  const saveLocationMutation = useMutation({
    mutationFn: (location: Location) => saveLocationApi(location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({ title: "Location Saved" });
    }
  });

  const savePrivilegesMutation = useMutation({
    mutationFn: (p: UserPrivileges) => saveUserPrivilegesAdmin(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPrivileges"] });
      toast({ title: "Privileges Updated" });
    },
    onError: () => {
      toast({ title: "Failed to update privileges", variant: "destructive" });
    }
  });

  const handlePrivilegeToggle = (key: keyof UserPrivileges, checked: boolean) => {
    const updated: UserPrivileges = {
      ...privileges,
      [key]: checked
    };
    setPrivileges(updated);
    savePrivilegesMutation.mutate(updated);
  };

  // --- UI ---

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage chatbot responses and map locations</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => window.open('/', '_blank')}>Open Chat Demo</Button>
             <Button variant="destructive" onClick={logout} className="flex items-center gap-2">
               <LogOut className="h-4 w-4" />
               Logout
             </Button>
          </div>
        </div>

        <Tabs defaultValue="responses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="responses" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Responses
            </TabsTrigger>
            <TabsTrigger value="privileges" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              User Privileges
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="responses" className="mt-6">
            <Card>
              <CardHeader className="flex flex-col items-start space-y-4">
                <div className="flex flex-row items-center justify-between w-full">
                  <div>
                    <CardTitle>Chatbot Responses</CardTitle>
                    <CardDescription>Manage chatbot responses and their location data</CardDescription>
                  </div>
                  <ResponseDialog onSave={saveResponseMutation.mutate} />
                </div>
                
                {/* Filters */}
                <div className="flex flex-row gap-4 w-full">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by intent or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="w-48">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Intent</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Has Map Data</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResponses.map((response) => (
                      <TableRow key={response.intent}>
                        <TableCell className="font-medium">{response.intent}</TableCell>
                        <TableCell>{response.category}</TableCell>
                        <TableCell>
                          <span className={response.responses?.mapData ? "text-blue-600 font-medium" : "text-gray-500"}>
                            {response.responses?.mapData ? "YES" : "NO"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                             <ResponseDialog 
                                response={response} 
                                onSave={saveResponseMutation.mutate} 
                                trigger={<Button variant="ghost" size="icon"><Edit2 className="h-4 w-4"/></Button>}
                             />
                             <Button variant="ghost" size="icon" onClick={() => deleteResponseMutation.mutate(response.intent)}>
                               <Trash2 className="h-4 w-4 text-destructive"/>
                             </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredResponses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No responses found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privileges" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Privileges</CardTitle>
                <CardDescription>Enable or disable user features in the chat widget</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-1">
                    <Label>User Chat</Label>
                    <p className="text-sm text-muted-foreground">Allow users to send messages</p>
                  </div>
                  <Switch
                    checked={privileges.chatEnabled}
                    onCheckedChange={(checked) => handlePrivilegeToggle("chatEnabled", checked)}
                    disabled={savePrivilegesMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-1">
                    <Label>Audio Input</Label>
                    <p className="text-sm text-muted-foreground">Show or hide the microphone input</p>
                  </div>
                  <Switch
                    checked={privileges.audioInputEnabled}
                    onCheckedChange={(checked) => handlePrivilegeToggle("audioInputEnabled", checked)}
                    disabled={savePrivilegesMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-1">
                    <Label>Map Access</Label>
                    <p className="text-sm text-muted-foreground">Allow users to view maps in responses</p>
                  </div>
                  <Switch
                    checked={privileges.mapAccessEnabled}
                    onCheckedChange={(checked) => handlePrivilegeToggle("mapAccessEnabled", checked)}
                    disabled={savePrivilegesMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

// --- Dialog Components ---

function ResponseDialog({ response, onSave, trigger }: { 
  response?: ResponseData, 
  onSave: (r: ResponseData) => void, 
  trigger?: React.ReactNode 
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ResponseData>>(response || {
    intent: "",
    category: "",
    sub_category: "",
    responses: {
      answer: [""],
      follow_up: [],
      context_slots: {}
    },
    metadata: {
      source: "admin"
    }
  });
  const initialMapCoordinates: [number, number] = (() => {
    const md = response?.responses.mapData;
    if (Array.isArray(md)) {
      return (md[0]?.coordinates as [number, number]) || [500, 500];
    }
    return ((md as any)?.coordinates as [number, number]) || [500, 500];
  })();

  const [hasMapData, setHasMapData] = useState(() => {
    const md = response?.responses.mapData;
    return Array.isArray(md) ? md.length > 0 : !!md;
  });
  const [mapCoordinates, setMapCoordinates] = useState<[number, number]>(initialMapCoordinates);

  const handleSubmit = () => {
    const finalResponse: ResponseData = {
      ...formData,
      responses: {
        ...formData.responses!,
        mapData: hasMapData
          ? {
              locationName: Array.isArray(formData.responses!.answer) 
                ? formData.responses!.answer[0] 
                : typeof formData.responses!.answer === 'string'
                ? formData.responses!.answer
                : "Location",
              coordinates: mapCoordinates,
              mapId: "main_map"
            }
          : undefined
      }
    } as ResponseData;
    
    onSave(finalResponse);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="mr-2 h-4 w-4"/> Add Response</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[730px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{response ? "Edit Response" : "New Response"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Intent Name</Label>
            <Input 
              value={formData.intent} 
              onChange={e => setFormData({...formData, intent: e.target.value})} 
              placeholder="e.g. get_wifi_access" 
            />
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <Input 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
              placeholder="e.g. ICT" 
            />
          </div>
          <div className="grid gap-2">
            <Label>Sub Category</Label>
            <Input 
              value={formData.sub_category} 
              onChange={e => setFormData({...formData, sub_category: e.target.value})} 
              placeholder="e.g. services" 
            />
          </div>
          <div className="grid gap-2">
            <Label>Response Answer</Label>
            <Textarea 
              value={
                Array.isArray(formData.responses?.answer) 
                  ? formData.responses.answer.join("\n") 
                  : typeof formData.responses?.answer === 'string'
                  ? formData.responses.answer
                  : ""
              } 
              onChange={e => setFormData({
                ...formData, 
                responses: {
                  ...formData.responses!,
                  answer: e.target.value.split("\n").filter(Boolean)
                }
              })} 
              placeholder="Enter response text (one per line)"
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label>Follow Up Questions (optional)</Label>
            <Textarea 
              value={
                Array.isArray(formData.responses?.follow_up) 
                  ? formData.responses.follow_up.join("\n") 
                  : ""
              } 
              onChange={e => setFormData({
                ...formData, 
                responses: {
                  ...formData.responses!,
                  follow_up: e.target.value.split("\n").filter(Boolean)
                }
              })} 
              placeholder="Enter follow up questions (one per line)"
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasMapData"
              checked={hasMapData}
              onChange={(e) => setHasMapData(e.target.checked)}
            />
            <Label htmlFor="hasMapData">Include location data</Label>
          </div>
          {hasMapData && (
            <div className="grid gap-2">
              <Label>Location on Map</Label>
              <InteractiveMap
                initialCoordinates={mapCoordinates}
                onCoordinatesChange={setMapCoordinates}
                width={600}
                height={600}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LocationDialog({ location, onSave, trigger }: { 
  location?: Location, 
  onSave: (l: Location) => void, 
  trigger?: React.ReactNode 
}) {
  const [open, setOpen] = useState(false);
  const [locationName, setLocationName] = useState(location?.name || "");
  const [mapCoordinates, setMapCoordinates] = useState<[number, number]>(
    Array.isArray(location?.coordinates) && location.coordinates.length === 2
      ? [location.coordinates[0], location.coordinates[1]]
      : [500, 500]
  );

  const handleSubmit = () => {
    const newLocation: Location = {
      name: locationName,
      coordinates: mapCoordinates,
      mapImage: location?.mapImage || "/generated_map.png",
      id: location?.id || `loc_${Date.now()}`
    };
    
    onSave(newLocation);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="mr-2 h-4 w-4"/> Add Location</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "New Location"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Location Name</Label>
            <Input 
              value={locationName} 
              onChange={e => setLocationName(e.target.value)} 
              placeholder="e.g. ICT Office" 
            />
          </div>
          <div className="grid gap-2">
            <Label>Location on Map</Label>
            <InteractiveMap
              initialCoordinates={mapCoordinates}
              onCoordinatesChange={setMapCoordinates}
              width={600}
              height={600}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
