# Phase 7: Social Feed Interactions

## Objective
Add like, comment, and high-five functionality to the social feed.

## Tasks

### Backend Interactions API
- [ ] Create Like model (user_id, activity_id)
- [ ] Create Comment model (user_id, activity_id, text, created_at)
- [ ] Implement POST /api/activities/:id/like endpoint
- [ ] Implement DELETE /api/activities/:id/like endpoint
- [ ] Implement POST /api/activities/:id/comments endpoint
- [ ] Implement GET /api/activities/:id/comments endpoint
- [ ] Add like/comment counts to activity responses
- [ ] Write tests for interaction endpoints

### High-Five System
- [ ] Design high-five as special like variant or separate model
- [ ] Implement high-five endpoint
- [ ] Add high-five count to activities
- [ ] Write tests for high-five logic

### Mobile Feed Interactions
- [ ] Add like button to ActivityCard
- [ ] Add comment button to ActivityCard
- [ ] Add high-five button to ActivityCard
- [ ] Show like/comment/high-five counts
- [ ] Create comment sheet/modal
- [ ] Show list of comments with user avatars
- [ ] Add optimistic UI updates for interactions
- [ ] Write UI tests for interactions

### Feed Updates
- [ ] Update feed to include interaction data
- [ ] Add "liked by you" indicator
- [ ] Sort comments by timestamp
- [ ] Test feed performance with interactions

## Success Criteria
- Users can like, comment, and high-five activities
- Interaction counts display correctly
- Comments show in chronological order
- All interaction endpoints have passing tests
- Mobile UI updates optimistically
