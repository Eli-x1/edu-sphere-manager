import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Subjects = () => {
  const { school } = useSchool();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningSubject, setAssigningSubject] = useState<any>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const fetchData = async () => {
    if (!school) return;
    setLoading(true);
    const [subRes, clsRes, csRes] = await Promise.all([
      supabase.from("subjects").select("*").eq("school_id", school.id).order("name"),
      supabase.from("classes").select("id, name, level").eq("school_id", school.id).order("name"),
      supabase.from("class_subjects" as any).select("*").eq("school_id", school.id),
    ]);
    setSubjects(subRes.data ?? []);
    setClasses(clsRes.data ?? []);
    setClassSubjects(csRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [school]);

  const getClassesForSubject = (subjectId: string) => {
    const classIds = classSubjects.filter(cs => cs.subject_id === subjectId).map(cs => cs.class_id);
    return classes.filter(c => classIds.includes(c.id));
  };

  const handleSave = async () => {
    if (!school || !name.trim()) return;
    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from("subjects").update({ name: name.trim(), abbreviation: abbreviation.trim() || null }).eq("id", editingId);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Subject updated" }); setEditingId(null); }
    } else {
      const { error } = await supabase.from("subjects").insert({ school_id: school.id, name: name.trim(), abbreviation: abbreviation.trim() || null });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Subject added" });
    }

    setName("");
    setAbbreviation("");
    setSaving(false);
    fetchData();
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setName(s.name);
    setAbbreviation(s.abbreviation || "");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Subject deleted" }); fetchData(); }
  };

  const openAssignDialog = (subject: any) => {
    setAssigningSubject(subject);
    const currentClassIds = classSubjects.filter(cs => cs.subject_id === subject.id).map(cs => cs.class_id);
    setSelectedClassIds(currentClassIds);
    setAssignDialogOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!school || !assigningSubject) return;
    setSavingAssignment(true);

    const currentClassIds = classSubjects.filter(cs => cs.subject_id === assigningSubject.id).map(cs => cs.class_id);
    const toAdd = selectedClassIds.filter(id => !currentClassIds.includes(id));
    const toRemove = currentClassIds.filter(id => !selectedClassIds.includes(id));

    const promises: any[] = [];

    if (toAdd.length > 0) {
      promises.push(
        supabase.from("class_subjects" as any).insert(
          toAdd.map(classId => ({ class_id: classId, subject_id: assigningSubject.id, school_id: school.id }))
        )
      );
    }

    for (const classId of toRemove) {
      promises.push(
        supabase.from("class_subjects" as any).delete()
          .eq("class_id", classId)
          .eq("subject_id", assigningSubject.id)
      );
    }

    const results = await Promise.all(promises);
    const hasError = results.some(r => r.error);
    if (hasError) {
      toast({ title: "Error saving assignments", variant: "destructive" });
    } else {
      toast({ title: "Class assignments updated" });
    }

    setSavingAssignment(false);
    setAssignDialogOpen(false);
    fetchData();
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
        <p className="text-sm text-muted-foreground">Manage subjects and assign them to classes</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{editingId ? "Edit Subject" : "Add Subject"}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" />
            </div>
            <div className="w-full sm:w-40 space-y-1">
              <Label>Abbreviation</Label>
              <Input value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} placeholder="e.g. MATH" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                <Plus className="h-4 w-4 mr-1" />{editingId ? "Update" : "Add"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={() => { setEditingId(null); setName(""); setAbbreviation(""); }}>Cancel</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All Subjects ({subjects.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Abbreviation</TableHead>
                  <TableHead>Assigned Classes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((s) => {
                  const assignedClasses = getClassesForSubject(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.abbreviation || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {assignedClasses.length === 0 ? (
                            <span className="text-sm text-muted-foreground">None</span>
                          ) : (
                            assignedClasses.map(c => (
                              <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openAssignDialog(s)} title="Assign to classes">
                            <BookOpen className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                                <AlertDialogDescription>This will also delete all grades and class assignments for this subject.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign "{assigningSubject?.name}" to Classes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes found. Create classes first.</p>
            ) : (
              classes.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`class-${c.id}`}
                    checked={selectedClassIds.includes(c.id)}
                    onCheckedChange={() => toggleClass(c.id)}
                  />
                  <label htmlFor={`class-${c.id}`} className="text-sm font-medium cursor-pointer">
                    {c.name}
                  </label>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAssignments} disabled={savingAssignment}>
              {savingAssignment ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subjects;
