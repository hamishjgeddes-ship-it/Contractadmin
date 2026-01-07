import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Upload, FolderOpen, FileText, File, Download, Trash2, Search } from "lucide-react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const DocumentsPage = ({ user }) => {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isLawyer = user?.role === "lawyer" || user?.role === "admin";

  const [uploadForm, setUploadForm] = useState({
    category: "general",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const categories = [
    { value: "contract", label: "Contract" },
    { value: "notice", label: "Notice" },
    { value: "correspondence", label: "Correspondence" },
    { value: "report", label: "Report" },
    { value: "general", label: "General" },
  ];

  const fetchData = async () => {
    try {
      const [docsRes, projectsRes] = await Promise.all([
        axios.get(`${API}/documents${filterProject ? `?project_id=${filterProject}` : ''}`, { withCredentials: true }),
        axios.get(`${API}/projects`, { withCredentials: true }),
      ]);
      setDocuments(docsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterProject]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedProject) {
      toast.error("Please select a file and project");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await axios.post(
        `${API}/documents?project_id=${selectedProject}&category=${uploadForm.category}&description=${encodeURIComponent(uploadForm.description)}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      toast.success("Document uploaded successfully");
      setDialogOpen(false);
      setSelectedFile(null);
      setSelectedProject("");
      setUploadForm({ category: "general", description: "" });
      fetchData();
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error(error.response?.data?.detail || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(`${API}/documents/${doc.document_id}`, { withCredentials: true });
      const content = response.data.content_base64;
      if (content) {
        const link = document.createElement("a");
        link.href = `data:${doc.file_type};base64,${content}`;
        link.download = doc.filename;
        link.click();
      }
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async (documentId) => {
    try {
      await axios.delete(`${API}/documents/${documentId}`, { withCredentials: true });
      toast.success("Document deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find((p) => p.project_id === projectId);
    return project?.name || projectId;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
    if (fileType?.includes("image")) return <File className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Layout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6" data-testid="documents-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              Document Library
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Access and manage project documents
            </p>
          </div>

          {isLawyer && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm h-10 px-6 text-xs uppercase tracking-wide font-medium"
                  data-testid="upload-document-btn"
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading">Upload Document</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger data-testid="upload-project-select" className="rounded-sm">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.project_id} value={project.project_id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={uploadForm.category}
                      onValueChange={(v) => setUploadForm({ ...uploadForm, category: v })}
                    >
                      <SelectTrigger className="rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>File</Label>
                    <Input
                      type="file"
                      data-testid="upload-file-input"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="rounded-sm"
                    />
                    <p className="text-xs text-slate-500">Max file size: 10MB</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Input
                      data-testid="upload-description-input"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Brief description..."
                      className="rounded-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uploading || !selectedFile || !selectedProject}
                      data-testid="submit-upload-btn"
                      className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-sm"
              data-testid="search-documents"
            />
          </div>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-48 rounded-sm">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.project_id} value={project.project_id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Documents Table */}
        {filteredDocuments.length === 0 ? (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-slate-900 mb-2">No documents</h3>
              <p className="text-slate-500 text-sm">
                {isLawyer ? "Upload your first document" : "No documents available"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200 shadow-none rounded-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">File</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Project</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Category</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Size</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Uploaded</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.document_id} data-testid={`document-row-${doc.document_id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.file_type)}
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{doc.filename}</p>
                            {doc.description && (
                              <p className="text-xs text-slate-500">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {getProjectName(doc.project_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-mono rounded-none capitalize">
                          {doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 font-mono">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {format(parseISO(doc.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                            data-testid={`download-${doc.document_id}`}
                            className="h-8 w-8"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {isLawyer && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(doc.document_id)}
                              data-testid={`delete-${doc.document_id}`}
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default DocumentsPage;
