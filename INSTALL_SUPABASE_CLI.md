# Installing Supabase CLI

## Option 1: Install via npm (Recommended)
```bash
npm install -g supabase
```

## Option 2: Install via Homebrew (macOS)
```bash
# First install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Supabase CLI
brew install supabase/tap/supabase
```

## Option 3: Download Binary Directly
Visit: https://github.com/supabase/cli/releases
Download the appropriate binary for macOS and add to PATH.

## After Installation
Verify installation:
```bash
supabase --version
```

## Login to Supabase
```bash
supabase login
```

## Link to Your Project
```bash
cd fms/fms
supabase link --project-ref <your-project-ref>
```

## Deploy Edge Function
```bash
supabase functions deploy telegram-webhook
```

