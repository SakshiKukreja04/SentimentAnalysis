import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Header } from "@/components/Header";
import { 
  Download, 
  FileText, 
  Search, 
  Calendar, 
  MoreHorizontal,
  Eye,
  Trash2,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ReportHistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Mock report data
  const reports = [
    {
      id: "RPT-001",
      title: "Q4 Public Policy Feedback Analysis",
      date: "2024-01-15",
      status: "completed",
      commentsCount: 1250,
      positivePercent: 45,
      negativePercent: 25,
      fileSize: "2.4 MB",
      type: "CSV Upload"
    },
    {
      id: "RPT-002", 
      title: "Community Development Survey Results",
      date: "2024-01-10",
      status: "completed",
      commentsCount: 890,
      positivePercent: 62,
      negativePercent: 18,
      fileSize: "1.8 MB",
      type: "Excel Upload"
    },
    {
      id: "RPT-003",
      title: "Environmental Policy Comments",
      date: "2024-01-08",
      status: "completed",
      commentsCount: 2100,
      positivePercent: 38,
      negativePercent: 35,
      fileSize: "3.2 MB",
      type: "Kafka Stream"
    },
    {
      id: "RPT-004",
      title: "Budget Proposal Public Feedback",
      date: "2024-01-05",
      status: "completed",
      commentsCount: 1560,
      positivePercent: 52,
      negativePercent: 28,
      fileSize: "2.1 MB",
      type: "CSV Upload"
    },
    {
      id: "RPT-005",
      title: "Transportation Initiative Analysis",
      date: "2024-01-03",
      status: "processing",
      commentsCount: 0,
      positivePercent: 0,
      negativePercent: 0,
      fileSize: "0 MB",
      type: "Excel Upload"
    }
  ];

  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = (reportId: string, title: string) => {
    toast({
      title: "Download Started",
      description: `Downloading report: ${title}`,
    });
  };

  const handleView = (reportId: string) => {
    toast({
      title: "Opening Report",
      description: "Report viewer will open in a new window",
    });
  };

  const handleDelete = (reportId: string, title: string) => {
    toast({
      title: "Report Deleted",
      description: `Deleted report: ${title}`,
      variant: "destructive",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-chart-positive/10 text-chart-positive border-chart-positive/20">Completed</Badge>;
      case "processing":
        return <Badge className="bg-chart-neutral/10 text-chart-neutral border-chart-neutral/20">Processing</Badge>;
      case "failed":
        return <Badge className="bg-chart-negative/10 text-chart-negative border-chart-negative/20">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      "CSV Upload": "bg-primary/10 text-primary border-primary/20",
      "Excel Upload": "bg-accent/10 text-accent border-accent/20",
      "Kafka Stream": "bg-chart-neutral/10 text-chart-neutral border-chart-neutral/20"
    };
    return colors[type as keyof typeof colors] || "bg-muted/20 text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        isAuthenticated={true} 
        user={{ name: "John Doe", isAdmin: true }} 
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Report History</h1>
          <p className="text-muted-foreground">View and manage your previous sentiment analysis reports</p>
        </div>

        {/* Search and Filter Bar */}
        <Card className="card-professional mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports by title or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Calendar className="mr-2 h-4 w-4" />
                  Date Range
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="card-professional">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Report Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{report.title}</h3>
                        <p className="text-sm text-muted-foreground">Report ID: {report.id}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(report.status)}
                        <Badge className={getTypeBadge(report.type)}>
                          {report.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Date Created</p>
                        <p className="text-sm font-medium">{new Date(report.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Comments</p>
                        <p className="text-sm font-medium">{report.commentsCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sentiment</p>
                        <div className="flex items-center space-x-1 text-sm">
                          <span className="text-chart-positive">{report.positivePercent}%</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-chart-negative">{report.negativePercent}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">File Size</p>
                        <p className="text-sm font-medium">{report.fileSize}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {report.status === "completed" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(report.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(report.id, report.title)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {report.status === "completed" && (
                          <>
                            <DropdownMenuItem onClick={() => handleView(report.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(report.id, report.title)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download Report
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDelete(report.id, report.title)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <Card className="card-professional">
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No reports found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "You haven't created any reports yet"}
                </p>
                {!searchTerm && (
                  <Button className="btn-hero">
                    <FileText className="mr-2 h-4 w-4" />
                    Create Your First Report
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comments Analyzed</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.reduce((sum, report) => sum + report.commentsCount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Across all reports</p>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Positive Sentiment</CardTitle>
              <FileText className="h-4 w-4 text-chart-positive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-positive">
                {Math.round(reports.filter(r => r.status === "completed").reduce((sum, report) => sum + report.positivePercent, 0) / reports.filter(r => r.status === "completed").length)}%
              </div>
              <p className="text-xs text-muted-foreground">Completed reports</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};