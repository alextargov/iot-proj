package devices

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/iot-proj/components/orchestrator/internal/auth"
	"github.com/iot-proj/components/orchestrator/internal/middlewares"
	"github.com/iot-proj/components/orchestrator/pkg/database"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readconcern"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"net/http"
)

func RegisterPrivateRouters(config auth.Config, converter EntityConverter, db database.PersistenceOp, router *gin.RouterGroup, deviceSvc DeviceSvc) {
	r := NewRouter(converter, db, deviceSvc)

	group := router.Group("/devices").Use(middlewares.Authz(config))

	group.GET("/:id", r.GetScopedByID)
	group.GET("/", r.GetScopedAll)
	group.POST("/", r.Create)
	group.PUT("/", r.Update)
	group.DELETE("/:id", r.Delete)
}

type DeviceSvc interface {
	GetAll(ctx context.Context) ([]*Model, error)
	GetScopedByID(ctx context.Context, userId, id string) (*Model, error)
	GetScopedAll(ctx context.Context, userId string) ([]*Model, error)
	Create(ctx context.Context, user *Model) (string, error)
	Update(ctx context.Context, user *Model) error
	DeleteById(ctx context.Context, id string) error
}

type Router struct {
	converter EntityConverter
	db        database.PersistenceOp
	deviceSvc DeviceSvc
}

func NewRouter(converter EntityConverter, db database.PersistenceOp, deviceSvc DeviceSvc) *Router {
	return &Router{
		converter: converter,
		db:        db,
		deviceSvc: deviceSvc,
	}
}

func (r *Router) GetAll(c *gin.Context) {
	ctx := c.Copy()

	opts := options.Session().SetDefaultReadConcern(readconcern.Majority())
	sess, err := r.db.StartSession(opts)
	if err != nil {
		logrus.Error(err)
	}
	defer sess.EndSession(ctx)

	txnOpts := options.Transaction().SetReadPreference(readpref.PrimaryPreferred())
	result, err := sess.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		c := database.SaveToContext(ctx, r.db)

		res, err := r.deviceSvc.GetAll(c)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}

			return nil, err
		}

		return res, err
	}, txnOpts)

	if err != nil {
		logrus.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (r *Router) Create(c *gin.Context) {
	ctx := c.Copy()

	opts := options.Session().SetDefaultReadConcern(readconcern.Majority())
	sess, err := r.db.StartSession(opts)
	if err != nil {
		logrus.Error(err)
	}
	defer sess.EndSession(ctx)

	txnOpts := options.Transaction().SetReadPreference(readpref.PrimaryPreferred())
	result, err := sess.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		ctx := database.SaveToContext(ctx, r.db)

		raw, err := c.GetRawData()
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		model, err := r.converter.FromRawToModel(raw)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		res, err := r.deviceSvc.Create(ctx, &model)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		return res, err
	}, txnOpts)

	if err != nil {
		logrus.Error(err)
		c.JSON(http.StatusInternalServerError, err)
	}

	c.JSON(http.StatusOK, result)
}

func (r *Router) Update(c *gin.Context) {
	ctx := c.Copy()

	opts := options.Session().SetDefaultReadConcern(readconcern.Majority())
	sess, err := r.db.StartSession(opts)
	if err != nil {
		logrus.Error(err)
	}
	defer sess.EndSession(ctx)

	txnOpts := options.Transaction().SetReadPreference(readpref.PrimaryPreferred())
	result, err := sess.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		ctx := database.SaveToContext(ctx, r.db)

		raw, err := c.GetRawData()
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		model, err := r.converter.FromRawToModel(raw)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		err = r.deviceSvc.Update(ctx, &model)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		return nil, err
	}, txnOpts)

	if err != nil {
		logrus.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (r *Router) GetScopedByID(c *gin.Context) {
	ctx := c.Copy()
	id, ok := c.Params.Get("id")
	if !ok {
		c.JSON(http.StatusInternalServerError, errors.New("id param is not provided"))
	}

	userId := c.GetHeader("userId")

	opts := options.Session().SetDefaultReadConcern(readconcern.Majority())
	sess, err := r.db.StartSession(opts)
	if err != nil {
		logrus.Error(err)
	}
	defer sess.EndSession(ctx)

	txnOpts := options.Transaction().SetReadPreference(readpref.PrimaryPreferred())
	result, err := sess.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		c := database.SaveToContext(ctx, r.db)

		res, err := r.deviceSvc.GetScopedByID(c, userId, id)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		return res, err
	}, txnOpts)

	if err != nil {
		logrus.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (r *Router) GetScopedAll(c *gin.Context) {
	ctx := c.Copy()

	userId := c.GetHeader("userId")

	opts := options.Session().SetDefaultReadConcern(readconcern.Majority())
	sess, err := r.db.StartSession(opts)
	if err != nil {
		logrus.Error(err)
	}
	defer sess.EndSession(ctx)

	txnOpts := options.Transaction().SetReadPreference(readpref.PrimaryPreferred())
	result, err := sess.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		c := database.SaveToContext(ctx, r.db)

		res, err := r.deviceSvc.GetScopedAll(c, userId)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		return res, err
	}, txnOpts)

	if err != nil {
		logrus.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func (r *Router) Delete(c *gin.Context) {
	ctx := c.Copy()
	param, ok := c.Params.Get("id")
	if !ok {
		c.JSON(http.StatusInternalServerError, errors.New("id param is not provided"))
	}

	opts := options.Session().SetDefaultReadConcern(readconcern.Majority())
	sess, err := r.db.StartSession(opts)
	if err != nil {
		logrus.Error(err)
	}
	defer sess.EndSession(ctx)

	txnOpts := options.Transaction().SetReadPreference(readpref.PrimaryPreferred())
	result, err := sess.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		c := database.SaveToContext(ctx, r.db)

		err := r.deviceSvc.DeleteById(c, param)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		return param, err
	}, txnOpts)

	if err != nil {
		logrus.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, result)
}
