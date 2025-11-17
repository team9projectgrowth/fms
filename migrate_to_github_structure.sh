#!/bin/bash
# Migration Script: Move files from fms/fms/ to fms/ root to match GitHub
set -e

cd /Users/manishgupta/team9projectlatest/fms

echo "=========================================="
echo "Migrating: fms/fms/ → fms/ (root)"
echo "=========================================="
echo ""

# Step 1: Create backup
echo "Step 1: Creating backup..."
BACKUP_DIR="../fms_backup_$(date +%Y%m%d_%H%M%S)"
cp -r . "$BACKUP_DIR"
echo "✓ Backup created: $BACKUP_DIR"
echo ""

# Step 2: Commit any uncommitted changes first
echo "Step 2: Checking for uncommitted changes..."
cd fms/fms
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠ Uncommitted changes found. Committing them..."
    git add .
    git commit -m "Backup before restructuring to match GitHub" || true
fi
cd ../..
echo ""

# Step 3: Move package.json (replace wrapper with actual)
echo "Step 3: Moving package.json..."
if [ -f "fms/fms/package.json" ]; then
    mv package.json package.json.wrapper.old
    cp fms/fms/package.json package.json
    echo "✓ package.json moved (wrapper saved as package.json.wrapper.old)"
fi
echo ""

# Step 4: Move package-lock.json
echo "Step 4: Moving package-lock.json..."
if [ -f "fms/fms/package-lock.json" ]; then
    [ -f "package-lock.json" ] && mv package-lock.json package-lock.json.old
    mv fms/fms/package-lock.json .
    echo "✓ package-lock.json moved"
fi
echo ""

# Step 5: Move all directories (except node_modules, dist, .git)
echo "Step 5: Moving directories..."
for dir in fms/fms/*/; do
    if [ -d "$dir" ]; then
        dirname=$(basename "$dir")
        
        # Skip these
        if [ "$dirname" = "node_modules" ] || [ "$dirname" = "dist" ] || [ "$dirname" = ".git" ] || [ "$dirname" = "fms" ]; then
            echo "  ⏭ Skipping $dirname/"
            continue
        fi
        
        # Handle existing directories - merge them
        if [ -d "$dirname" ]; then
            echo "  ⚠ Directory $dirname/ exists, merging..."
            cp -rn "$dir"* "$dirname/" 2>/dev/null || true
            rm -rf "$dir"
        else
            echo "  ✓ Moving $dirname/ to root"
            mv "$dir" ./
        fi
    fi
done
echo ""

# Step 6: Move all files
echo "Step 6: Moving files..."
for file in fms/fms/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        
        # Skip already moved files
        if [ "$filename" = "package.json" ] || [ "$filename" = "package-lock.json" ]; then
            continue
        fi
        
        # Replace existing files with fms/fms/ versions
        if [ -f "$filename" ]; then
            echo "  ⚠ Replacing $filename"
            mv "$filename" "${filename}.old"
        else
            echo "  ✓ Moving $filename"
        fi
        mv "$file" ./
    fi
done
echo ""

# Step 7: Move hidden files (except .git)
echo "Step 7: Moving hidden files..."
for file in fms/fms/.*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        
        if [ "$filename" = ".git" ] || [ "$filename" = "." ] || [ "$filename" = ".." ]; then
            continue
        fi
        
        # Merge .gitignore
        if [ "$filename" = ".gitignore" ]; then
            echo "  ✓ Merging .gitignore"
            cat .gitignore fms/fms/.gitignore 2>/dev/null | sort -u > .gitignore.new
            mv .gitignore.new .gitignore
            rm fms/fms/.gitignore
            continue
        fi
        
        if [ -f "$filename" ]; then
            echo "  ⚠ Replacing $filename"
            mv "$filename" "${filename}.old"
        else
            echo "  ✓ Moving $filename"
        fi
        mv "$file" ./
    fi
done
echo ""

# Step 8: Handle nested fms/fms/fms/ - move its contents up
echo "Step 8: Handling nested fms/fms/fms/..."
if [ -d "fms/fms/fms" ]; then
    echo "  ⚠ Found nested fms/fms/fms/, moving contents..."
    # Move files from fms/fms/fms/ to root (skip if already exists)
    find fms/fms/fms -type f | while read file; do
        relpath=${file#fms/fms/fms/}
        if [ ! -f "$relpath" ]; then
            mkdir -p "$(dirname "$relpath")"
            mv "$file" "$relpath"
        fi
    done
    rm -rf fms/fms/fms
fi
echo ""

# Step 9: Clean up empty directories
echo "Step 9: Cleaning up..."
if [ -d "fms/fms" ]; then
    # Remove empty fms/fms
    remaining=$(find fms/fms -mindepth 1 -maxdepth 1 ! -name 'node_modules' ! -name 'dist' ! -name '.git' 2>/dev/null | wc -l | tr -d ' ')
    if [ "$remaining" -eq 0 ]; then
        echo "  ✓ Removing empty fms/fms/"
        rm -rf fms/fms
    else
        echo "  ⚠ fms/fms/ still has content, keeping it"
    fi
fi

# Remove old wrapper fms/ if it only contains node_modules/dist
if [ -d "fms" ] && [ ! -d "fms/fms" ]; then
    echo "  ✓ Removing wrapper fms/ directory"
    rm -rf fms
fi
echo ""

# Step 10: Verify structure
echo "Step 10: Verifying structure..."
echo ""
[ -f "package.json" ] && echo "✓ package.json" || echo "✗ package.json missing"
[ -d "src" ] && echo "✓ src/" || echo "✗ src/ missing"
[ -d "supabase" ] && echo "✓ supabase/" || echo "✗ supabase/ missing"
[ -f "vercel.json" ] && echo "✓ vercel.json" || echo "✗ vercel.json missing"
echo ""

# Step 11: Update git to reflect new structure
echo "Step 11: Updating git..."
cd /Users/manishgupta/team9projectlatest/fms
git add -A
echo "✓ Git staging updated"
echo ""

echo "=========================================="
echo "Migration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Test build: npm install && npm run build"
echo "3. If successful:"
echo "   git commit -m 'Restructure: Move files to root to match GitHub'"
echo "   git push origin main"
echo ""
echo "4. Update Vercel Root Directory to: (empty/blank)"
echo ""
echo "Backup: $BACKUP_DIR"
echo ""

