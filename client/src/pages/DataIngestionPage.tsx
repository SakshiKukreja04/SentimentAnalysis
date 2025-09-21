import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/Header";
import { 
  Upload, 
  FileSpreadsheet, 
  Database, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Activity,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const DataIngestionPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [kafkaConfig, setKafkaConfig] = useState({
    brokerUrl: "",
    topic: "",
    consumerGroup: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast({
        title: "File Selected",
        description: `Selected ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    }
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setUploadProgress(0);

    // Simulate file upload and processing
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
            toast({
              title: "Analysis Complete",
              description: "Your data has been successfully analyzed. Redirecting to dashboard...",
            });
            setTimeout(() => navigate("/dashboard"), 1500);
          }, 1000);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleKafkaConnect = () => {
    if (!kafkaConfig.brokerUrl || !kafkaConfig.topic) {
      toast({
        title: "Configuration Required",
        description: "Please fill in all Kafka connection details.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Kafka Connection Established",
      description: "Real-time data stream connected successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        isAuthenticated={true} 
        user={{ name: "Admin User", isAdmin: true }} 
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Data Ingestion</h1>
          <p className="text-muted-foreground">Upload files or connect to real-time data streams for sentiment analysis</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>File Upload</span>
              </TabsTrigger>
              <TabsTrigger value="kafka" className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>Kafka Stream</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* File Upload Section */}
                <Card className="card-dashboard">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      <span>Upload Data File</span>
                    </CardTitle>
                    <CardDescription>
                      Upload CSV or Excel files containing comments or feedback data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                      <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium">Upload your data file</h3>
                        <p className="text-sm text-muted-foreground">
                          Drag and drop or click to select CSV, XLSX files
                        </p>
                      </div>
                      <Input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="mt-4"
                      />
                    </div>

                    {selectedFile && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                          <FileSpreadsheet className="h-8 w-8 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <CheckCircle className="h-5 w-5 text-chart-positive" />
                        </div>

                        {isProcessing && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Processing...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} />
                          </div>
                        )}

                        <Button 
                          onClick={handleAnalyzeFile} 
                          className="btn-hero w-full"
                          disabled={isProcessing}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          {isProcessing ? "Analyzing..." : "Analyze Data"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* File Requirements */}
                <Card className="card-dashboard">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5" />
                      <span>File Requirements</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Supported Formats</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• CSV files (.csv)</li>
                        <li>• Excel files (.xlsx, .xls)</li>
                        <li>• Maximum file size: 100MB</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Required Columns</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>comment</strong> or <strong>text</strong> - The feedback content</li>
                        <li>• <strong>id</strong> (optional) - Unique identifier</li>
                        <li>• <strong>timestamp</strong> (optional) - Date/time</li>
                        <li>• <strong>category</strong> (optional) - Comment category</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Sample Data Format</h4>
                      <div className="bg-muted/20 p-3 rounded text-xs font-mono">
                        <div>id,comment,timestamp</div>
                        <div>1,"Great policy change",2024-01-15</div>
                        <div>2,"Needs more clarity",2024-01-16</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="kafka">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Kafka Configuration */}
                <Card className="card-dashboard">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="h-5 w-5" />
                      <span>Kafka Configuration</span>
                    </CardTitle>
                    <CardDescription>
                      Connect to real-time Kafka data streams
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="brokerUrl">Broker URL</Label>
                      <Input
                        id="brokerUrl"
                        placeholder="localhost:9092"
                        value={kafkaConfig.brokerUrl}
                        onChange={(e) => setKafkaConfig(prev => ({ ...prev, brokerUrl: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="topic">Topic Name</Label>
                      <Input
                        id="topic"
                        placeholder="sentiment-data"
                        value={kafkaConfig.topic}
                        onChange={(e) => setKafkaConfig(prev => ({ ...prev, topic: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consumerGroup">Consumer Group</Label>
                      <Input
                        id="consumerGroup"
                        placeholder="sentiment-analyzer"
                        value={kafkaConfig.consumerGroup}
                        onChange={(e) => setKafkaConfig(prev => ({ ...prev, consumerGroup: e.target.value }))}
                      />
                    </div>

                    <Button onClick={handleKafkaConnect} className="btn-accent w-full">
                      <Database className="mr-2 h-4 w-4" />
                      Connect to Stream
                    </Button>
                  </CardContent>
                </Card>

                {/* Stream Status */}
                <Card className="card-dashboard">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Stream Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-8">
                      <div className="mx-auto w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                        <Database className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No active streams</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure and connect to start real-time analysis
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Stream Features</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-chart-positive" />
                          <span>Real-time sentiment analysis</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-chart-positive" />
                          <span>Live dashboard updates</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-chart-positive" />
                          <span>Automatic report generation</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-chart-positive" />
                          <span>Alert notifications</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};