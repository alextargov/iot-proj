package users

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

func RegisterPrivateRouters(config auth.Config, converter EntityConverter, db database.PersistenceOp, router *gin.RouterGroup, userSvc UserSvc) {
	r := NewRouter(converter, db, userSvc)

	group := router.Group("/users").Use(middlewares.Authz(config))

	group.GET("/:id", r.GetByID)
	group.GET("/", r.GetAll)
	group.POST("/", r.Create)
	group.PUT("/", r.Update)
	group.DELETE("/:id", r.Delete)
}

func RegisterPublicRouters(converter EntityConverter, db database.PersistenceOp, router *gin.RouterGroup, userSvc UserSvc) {
	r := NewRouter(converter, db, userSvc)
	group := router.Group("/public")
	group.POST("/register", r.Register)
	group.POST("/login", r.Login)
}

type UserSvc interface {
	GetAll(ctx context.Context) ([]*UserModel, error)
	Create(ctx context.Context, model *UserModel) (string, error)
	DeleteById(ctx context.Context, id string) error
	Update(ctx context.Context, model *UserModel) error
	GetGlobalByID(ctx context.Context, id string) (*UserModel, error)
	Login(ctx context.Context, l LoginModel) (string, error)
	Register(ctx context.Context, user *UserModel) (string, error)
}

type Router struct {
	userSvc   UserSvc
	db        database.PersistenceOp
	converter EntityConverter
}

func NewRouter(converter EntityConverter, db database.PersistenceOp, userSvc UserSvc) *Router {
	return &Router{
		converter: converter,
		userSvc:   userSvc,
		db:        db,
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

		res, err := r.userSvc.GetAll(c)
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

		res, err := r.userSvc.Create(ctx, &model)
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

func (r *Router) Register(c *gin.Context) {
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

		res, err := r.userSvc.Register(ctx, &model)
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

func (r *Router) Login(c *gin.Context) {
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

		model, err := r.converter.FromRawToLoginModel(raw)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		token, err := r.userSvc.Login(ctx, model)
		if err != nil {
			if e := sessCtx.AbortTransaction(ctx); e != nil {
				return nil, e
			}
			return nil, err
		}

		return token, err
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

		err = r.userSvc.Update(ctx, &model)
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

func (r *Router) GetByID(c *gin.Context) {
	ctx := c.Copy()
	id, ok := c.Params.Get("id")
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

		res, err := r.userSvc.GetGlobalByID(c, id)
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

		err := r.userSvc.DeleteById(c, param)
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
