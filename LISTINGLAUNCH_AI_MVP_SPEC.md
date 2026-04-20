# ListingLaunch AI MVP Spec

This is the build-ready MVP companion to `REAL_ESTATE_AI_MARKETING_SAAS_BLUEPRINT.md`.

## Product Goal

Help a solo real estate agent generate a complete listing marketing package from one structured input flow.

## Success Metric

A first-time user can create one listing and export at least 5 usable marketing assets in under 10 minutes.

## Primary User Story

As a solo agent, I want to enter one listing once and instantly get all the copy I need to market it across channels, so I can launch faster without hiring help.

## Core User Flow

1. Sign up
2. Create brand profile
3. Add listing details
4. Generate listing launch kit
5. Review and edit outputs
6. Copy or export assets
7. Return later to regenerate or create a new listing

## MVP Screens

### 1. Landing Page

- headline
- product explainer
- pricing
- CTA to start trial

### 2. Auth

- sign up
- log in
- forgot password

### 3. Brand Profile Setup

- agent name
- brokerage name
- service area
- brand tone
- CTA defaults
- disclaimer/compliance notes

### 4. Dashboard

- active listings
- recent generated assets
- button to add listing
- plan usage summary

### 5. New Listing Form

- address
- price
- beds/baths/sqft
- property type
- neighborhood highlights
- key selling points
- open house date and time
- photo upload

### 6. Listing Launch Kit Page

- tabs by asset type
- edit box for each output
- regenerate button
- copy button
- export bundle action

### 7. Billing

- current plan
- upgrade
- usage limit notice

## MVP Outputs

Each listing should generate:

- MLS description
- website description
- Instagram caption
- Facebook caption
- LinkedIn post
- email announcement
- SMS teaser
- open house post
- flyer headline and bullets
- 30-second video script

## Functional Requirements

### Auth

- email/password auth
- protected app routes

### Listing Creation

- save draft listing
- edit listing later
- store uploaded photos

### AI Generation

- generate all assets from one listing
- regenerate single asset
- preserve listing facts across outputs
- apply brand voice consistently

### Asset Editing

- rich textarea or plain textarea editing
- save edited content
- version history is optional for V1

### Export

- one-click copy per asset
- export all text as one document

### Billing

- limit active listing kits by plan
- prevent new generation when limit is exceeded

## Non-Goals For V1

- CRM sync
- lead scoring
- social scheduling
- ad buying
- brokerage multi-user support
- Canva direct export

## Suggested Database Tables

### `profiles`

- `id`
- `user_id`
- `agent_name`
- `brokerage_name`
- `service_area`
- `brand_tone`
- `cta_default`
- `compliance_notes`

### `listings`

- `id`
- `user_id`
- `address`
- `price`
- `beds`
- `baths`
- `sqft`
- `property_type`
- `neighborhood_highlights`
- `selling_points`
- `open_house_details`
- `status`

### `assets`

- `id`
- `listing_id`
- `asset_type`
- `content`
- `generated_at`
- `updated_at`

### `subscriptions`

- `id`
- `user_id`
- `plan_name`
- `listing_limit`
- `status`

## AI Generation Architecture

### Step 1. Listing Normalizer

Turn raw form input into a structured property summary.

### Step 2. Angle Finder

Extract the strongest hooks:

- lifestyle angle
- neighborhood angle
- value angle
- urgency angle

### Step 3. Brand Voice Pass

Apply agent tone:

- luxury
- friendly
- direct
- family-focused
- investor-focused

### Step 4. Channel Generator

Create one asset at a time with channel-specific constraints.

## Acceptance Criteria

The MVP is ready when:

- a new user can onboard without help
- one listing generates all 10 core assets
- output is factually consistent
- regeneration works per asset
- text can be copied easily
- billing limits work

## Build Order

1. Landing page and auth
2. Brand profile
3. Listing form
4. AI generation pipeline
5. Asset editing and copy actions
6. Billing

## Demo Script

For sales and validation, show this exact flow:

1. Create a new listing in under 2 minutes
2. Click generate
3. Show the MLS description
4. Show the Instagram post
5. Show the email blast
6. Copy the content
7. Explain the time saved

## Best Validation Question

Ask early users:

**"If this saved you 2 to 3 hours every time you launched a listing, would you pay $49 to $79 per month for it?"**

That question gets you closer to real willingness to pay than asking whether they "like the idea."
