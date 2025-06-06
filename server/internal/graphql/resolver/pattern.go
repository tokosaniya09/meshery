package resolver

import (
	"context"
	"encoding/json"

	"github.com/layer5io/meshery/server/internal/graphql/model"
	"github.com/layer5io/meshery/server/models"
)

func (r *Resolver) fetchPatterns(ctx context.Context, provider models.Provider, selector model.PageFilter) (*model.PatternPageResult, error) {
	tokenString := ctx.Value(models.TokenCtxKey).(string)
	// user := ctx.Value(models.UserCtxKey).(*models.User)
	// prefObj := ctx.Value(models.PerfObjCtxKey).(*models.Preference)
	var updateAfter string
	if selector.UpdatedAfter != nil {
		updateAfter = *selector.UpdatedAfter
	}
	var order string
	if selector.Order != nil {
		order = *selector.Order
	}
	var search string
	if selector.Search != nil {
		search = *selector.Search
	}
	metrics := "false"
	if selector.Metrics != nil {
		metrics = *selector.Metrics
	}

	populate := []string{}
	for _, populatePtr := range selector.Populate {
		if populatePtr != nil {
			populate = append(populate, *populatePtr)
		}
	}

	resp, err := provider.GetMesheryPatterns(tokenString, selector.Page, selector.PageSize, search, order, updateAfter, selector.Visibility, metrics, populate)

	if err != nil {
		r.Log.Error(ErrFetchingPatterns(err))
		return nil, err
	}

	// mc := handlers.NewContentModifier(tokenString, provider, prefObj, user.UserID)
	// err = mc.AddMetadataForPatterns(ctx, &resp)
	if err != nil {
		r.Log.Error(ErrFetchingPatterns(err))
	}

	patterns := &model.PatternPageResult{}

	if err := json.Unmarshal(resp, patterns); err != nil {
		obj := "result data"
		return nil, models.ErrUnmarshal(err, obj)
	}

	return patterns, nil
}
