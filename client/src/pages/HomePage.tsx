import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  BarChart3, 
  Brain, 
  FileText, 
  MessageCircle, 
  Shield, 
  Zap, 
  TrendingUp,
  Users,
  Clock,
  ArrowRight
} from "lucide-react";

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/5 via-primary/5 to-accent/5"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="heading-hero mb-6">
              Professional Sentiment Analysis for Legal & Government Data
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Analyze, summarize, and visualize sentiment data with enterprise-grade accuracy. 
              Built specifically for legal professionals and government institutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button className="btn-hero text-lg px-8 py-4">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="text-lg px-8 py-4 border-2">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="heading-section mb-4">Powerful Analytics Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to analyze sentiment data with professional precision and insight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-professional group hover:border-primary/20">
              <CardHeader className="text-center">
                <div className="mx-auto bg-gradient-to-r from-primary to-primary-dark p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Advanced Sentiment Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-pro">
                  AI-powered sentiment detection with detailed comment-wise analysis and broad summaries.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-professional group hover:border-accent/20">
              <CardHeader className="text-center">
                <div className="mx-auto bg-gradient-to-r from-accent to-[hsl(160_84%_45%)] p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform duration-200">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Intelligent Summarization</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-pro">
                  Automatically generate comprehensive reports with key insights and actionable recommendations.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-professional group hover:border-primary/20">
              <CardHeader className="text-center">
                <div className="mx-auto bg-gradient-to-r from-primary to-accent p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform duration-200">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Visual Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-pro">
                  Interactive word clouds, sentiment distribution charts, and comprehensive data visualizations.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-professional group hover:border-accent/20">
              <CardHeader className="text-center">
                <div className="mx-auto bg-gradient-to-r from-accent to-primary p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform duration-200">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Query Chatbot</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-pro">
                  Ask questions about your data and get instant, intelligent responses based on analysis results.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="heading-section mb-4">Why Legal & Government Professionals Choose Us</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Built with the highest standards of security, accuracy, and professional requirements in mind.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto bg-gradient-to-r from-primary to-primary-dark p-4 rounded-xl w-fit mb-6">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Enterprise Security</h3>
                <p className="text-muted-foreground">
                  Bank-level security with encryption, compliance standards, and data protection protocols.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto bg-gradient-to-r from-accent to-[hsl(160_84%_45%)] p-4 rounded-xl w-fit mb-6">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
                <p className="text-muted-foreground">
                  Process thousands of comments and generate comprehensive reports in minutes, not hours.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto bg-gradient-to-r from-primary to-accent p-4 rounded-xl w-fit mb-6">
                  <TrendingUp className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Actionable Insights</h3>
                <p className="text-muted-foreground">
                  Get clear, actionable insights that help you make informed decisions based on data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary mr-2" />
                <span className="text-4xl font-bold text-foreground">10K+</span>
              </div>
              <p className="text-muted-foreground font-medium">Professionals Trust Us</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-accent mr-2" />
                <span className="text-4xl font-bold text-foreground">1M+</span>
              </div>
              <p className="text-muted-foreground font-medium">Documents Analyzed</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-primary mr-2" />
                <span className="text-4xl font-bold text-foreground">99.9%</span>
              </div>
              <p className="text-muted-foreground font-medium">Uptime Guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="heading-section mb-6">Ready to Transform Your Data Analysis?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of legal and government professionals who trust SentimentPro 
              for their data analysis needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button className="btn-hero text-lg px-8 py-4">
                  Start
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" className="text-lg px-8 py-4 border-2">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};