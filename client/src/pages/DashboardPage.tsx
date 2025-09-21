import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/Header";
import { 
  Download, 
  MessageCircle, 
  Send, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  PieChart,
  FileText,
  Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const DashboardPage = () => {
  const [chatQuery, setChatQuery] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      type: "bot",
      message: "Hello! I'm your sentiment analysis assistant. Ask me anything about your data analysis results."
    }
  ]);
  const { toast } = useToast();

  // Mock data for demonstration
  const sentimentSummary = {
    positive: 45,
    negative: 25,
    neutral: 30,
    totalComments: 1250,
    averageScore: 2.8
  };

  const commentAnalysis = [
    { id: 1, text: "This policy change is excellent and will benefit everyone.", sentiment: "positive", score: 0.85 },
    { id: 2, text: "I'm concerned about the implementation timeline.", sentiment: "negative", score: -0.65 },
    { id: 3, text: "The proposal seems reasonable overall.", sentiment: "neutral", score: 0.15 },
    { id: 4, text: "This is a great step forward for our community.", sentiment: "positive", score: 0.78 },
    { id: 5, text: "More clarity is needed on the budget implications.", sentiment: "negative", score: -0.45 },
  ];

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    const userMessage = { type: "user", message: chatQuery };
    const botResponse = { 
      type: "bot", 
      message: `Based on the analysis, here's what I found regarding "${chatQuery}": The sentiment distribution shows ${sentimentSummary.positive}% positive feedback. This indicates a generally favorable response to the topic you're asking about.`
    };

    setChatMessages(prev => [...prev, userMessage, botResponse]);
    setChatQuery("");
  };

  const handleDownloadReport = () => {
    toast({
      title: "Report Generated",
      description: "Your sentiment analysis report has been prepared for download.",
    });
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return <TrendingUp className="h-4 w-4 text-chart-positive" />;
      case "negative": return <TrendingDown className="h-4 w-4 text-chart-negative" />;
      default: return <Minus className="h-4 w-4 text-chart-neutral" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    const variants = {
      positive: "bg-chart-positive/10 text-chart-positive border-chart-positive/20",
      negative: "bg-chart-negative/10 text-chart-negative border-chart-negative/20",
      neutral: "bg-chart-neutral/10 text-chart-neutral border-chart-neutral/20"
    };
    return variants[sentiment as keyof typeof variants] || variants.neutral;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        isAuthenticated={true} 
        user={{ name: "John Doe", isAdmin: true }} 
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analysis Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive sentiment analysis results and insights</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sentimentSummary.totalComments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Analyzed in this batch</p>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Positive Sentiment</CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-positive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-positive">{sentimentSummary.positive}%</div>
              <Progress value={sentimentSummary.positive} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Negative Sentiment</CardTitle>
              <TrendingDown className="h-4 w-4 text-chart-negative" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-negative">{sentimentSummary.negative}%</div>
              <Progress value={sentimentSummary.negative} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sentimentSummary.averageScore}/5</div>
              <p className="text-xs text-muted-foreground">Overall sentiment rating</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Analysis Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Detailed Comment Analysis */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Comment-wise Analysis</span>
                </CardTitle>
                <CardDescription>
                  Detailed sentiment analysis for individual comments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commentAnalysis.map((comment) => (
                    <div key={comment.id} className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-foreground flex-1">{comment.text}</p>
                        <div className="ml-4 flex items-center space-x-2">
                          {getSentimentIcon(comment.sentiment)}
                          <Badge className={getSentimentBadge(comment.sentiment)}>
                            {comment.sentiment}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>Score: {comment.score}</span>
                        <span>•</span>
                        <span>Confidence: {Math.abs(comment.score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Visualizations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="card-dashboard">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Sentiment Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="transparent"
                          stroke="hsl(var(--chart-positive))"
                          strokeWidth="20"
                          strokeDasharray={`${sentimentSummary.positive * 5.03} 502.4`}
                          strokeDashoffset="0"
                          className="rotate-[-90deg] origin-center"
                        />
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="transparent"
                          stroke="hsl(var(--chart-negative))"
                          strokeWidth="20"
                          strokeDasharray={`${sentimentSummary.negative * 5.03} 502.4`}
                          strokeDashoffset={`-${sentimentSummary.positive * 5.03}`}
                          className="rotate-[-90deg] origin-center"
                        />
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="transparent"
                          stroke="hsl(var(--chart-neutral))"
                          strokeWidth="20"
                          strokeDasharray={`${sentimentSummary.neutral * 5.03} 502.4`}
                          strokeDashoffset={`-${(sentimentSummary.positive + sentimentSummary.negative) * 5.03}`}
                          className="rotate-[-90deg] origin-center"
                        />
                        <text x="100" y="95" textAnchor="middle" className="text-sm font-medium fill-foreground">Sentiment</text>
                        <text x="100" y="110" textAnchor="middle" className="text-xs fill-muted-foreground">Distribution</text>
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-chart-positive rounded"></div>
                        <span className="text-sm">Positive</span>
                      </div>
                      <span className="text-sm font-medium">{sentimentSummary.positive}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-chart-negative rounded"></div>
                        <span className="text-sm">Negative</span>
                      </div>
                      <span className="text-sm font-medium">{sentimentSummary.negative}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-chart-neutral rounded"></div>
                        <span className="text-sm">Neutral</span>
                      </div>
                      <span className="text-sm font-medium">{sentimentSummary.neutral}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-dashboard">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Word Cloud</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-container">
                    <div className="flex flex-wrap gap-2 justify-center items-center h-32 w-full">
                      <span className="text-lg font-medium text-chart-positive">excellent</span>
                      <span className="text-sm text-muted-foreground">policy</span>
                      <span className="text-base font-medium text-chart-negative">concerned</span>
                      <span className="text-xl font-bold text-primary">community</span>
                      <span className="text-sm text-chart-neutral">reasonable</span>
                      <span className="text-base font-medium text-chart-positive">great</span>
                      <span className="text-lg font-medium text-chart-negative">clarity</span>
                      <span className="text-sm text-foreground">implementation</span>
                      <span className="text-base font-medium text-primary">benefit</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Broad Summary */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle>Executive Summary</CardTitle>
                <CardDescription>
                  High-level insights and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none text-sm">
                  <p className="mb-4">
                    <strong>Overall Sentiment:</strong> The analysis reveals a predominantly positive reception 
                    with 45% positive sentiment, indicating strong community support for the proposed changes.
                  </p>
                  <p className="mb-4">
                    <strong>Key Themes:</strong> Major discussion points include implementation timelines, 
                    community benefits, and budget implications. Positive feedback centers around policy 
                    excellence and community benefits.
                  </p>
                  <p className="mb-4">
                    <strong>Areas of Concern:</strong> 25% negative sentiment primarily relates to implementation 
                    concerns and requests for additional clarity on specific aspects.
                  </p>
                  <p>
                    <strong>Recommendation:</strong> Address implementation timeline concerns and provide 
                    additional budget clarity to further improve public sentiment.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Download Report - Moved here */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle>Generate Report</CardTitle>
                <CardDescription>
                  Download comprehensive analysis report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownloadReport} className="btn-accent w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Query Chatbot */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Ask Questions</span>
                </CardTitle>
                <CardDescription>
                  Query your analysis results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Chat Messages */}
                  <div className="max-h-64 overflow-y-auto space-y-3 p-3 bg-muted/20 rounded-lg">
                    {chatMessages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
                          msg.type === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-background border border-border"
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleChatSubmit} className="flex space-x-2">
                    <Input
                      placeholder="Ask about your data..."
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" className="bg-primary hover:bg-primary-dark">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};