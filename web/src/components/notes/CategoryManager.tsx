import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotesStore } from "@/store/useNotesStore";
import { Trash2, Edit2, Check, X, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CategoryManager({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { categories, renameCategory, deleteCategory } = useNotesStore();
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteCat, setDeleteCat] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startEdit = (name: string) => {
    setEditingCat(name);
    setEditValue(name);
  };

  const handleRename = async () => {
    if (!editingCat || !editValue.trim() || editingCat === editValue.trim()) {
      setEditingCat(null);
      return;
    }
    setIsProcessing(true);
    try {
      await renameCategory(editingCat, editValue.trim());
      toast.success("Category renamed successfully");
    } catch (e) {
      toast.error("Failed to rename category");
    } finally {
      setIsProcessing(false);
      setEditingCat(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteCat) return;
    setIsProcessing(true);
    try {
      await deleteCategory(deleteCat);
      toast.success("Category deleted");
    } catch (e) {
      toast.error("Failed to delete category");
    } finally {
      setIsProcessing(false);
      setDeleteCat(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" /> Manage Categories
            </DialogTitle>
            <DialogDescription className="sr-only">
              Manage your note categories, rename or delete them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 mt-4">
            {categories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                {editingCat === cat.name ? (
                  <div className="flex flex-1 items-center gap-2 mr-2">
                    <Input 
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="bg-background border-border h-8"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleRename()}
                      disabled={isProcessing}
                    />
                    <Button size="icon" variant="ghost" onClick={handleRename} disabled={isProcessing} className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingCat(null)} disabled={isProcessing} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">{cat.count} note{cat.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(cat.name)} disabled={isProcessing} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteCat(cat.name)} disabled={isProcessing} className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No categories found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCat} onOpenChange={(open) => !open && setDeleteCat(null)}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete the category "{deleteCat}"? Any notes using this category will be moved to "General".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
