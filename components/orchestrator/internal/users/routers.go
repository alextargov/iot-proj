package users

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/iot-proj/components/orchestrator/pkg/database"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readconcern"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

//func UsersRegister(router *gin.RouterGroup) {
//	router.POST("/register", RegisterUser)
//	router.POST("/login", LoginUser)
//}
//
//func Users(router *gin.RouterGroup) {
//	router.GET("/:id", GetUserById)
//	router.POST("/", CreateUser)
//	router.PUT("/", UpdateUser)
//	router.DELETE("/:id", DeleteUser)
//}

func RegisterRouters(ctx context.Context, db database.PersistenceOp, router *gin.RouterGroup, userSvc UserSvc) {
	r := NewRouter(ctx, db, userSvc)

	//router.POST("/register", RegisterUser)
	//router.POST("/login", LoginUser)

	router.GET("/:id", r.GetGlobalByID)
	router.GET("/", r.GetAll)
	router.POST("/", r.Create)
	router.PUT("/", r.Update)
	router.DELETE("/:id", r.Delete)
}

type UserSvc interface {
	GetAll(ctx context.Context) ([]*UserModel, error)
	Create(ctx context.Context, model *UserModel) (interface{}, error)
	Exists(ctx context.Context, id string) (bool, error)
	Update(ctx context.Context, model *UserModel) error
	GetGlobalByID(ctx context.Context, id string) (*UserModel, error)
}

type Router struct {
	ctx     context.Context
	userSvc UserSvc
	db      database.PersistenceOp
}

func NewRouter(ctx context.Context, db database.PersistenceOp, userSvc UserSvc) *Router {

	return &Router{
		userSvc: userSvc,
		db:      db,
	}
}

func (r *Router) GetAll(c *gin.Context) {
	opts := options.Session().SetDefaultReadConcern(readconcern.Majority())
	sess, err := r.db.StartSession(opts)
	if err != nil {
		logrus.Fatal(err)
	}
	defer sess.EndSession(context.TODO())

	// Specify the ReadPreference option to set the read preference to primary preferred for this transaction.
	txnOpts := options.Transaction().SetReadPreference(readpref.PrimaryPreferred())
	result, err := sess.WithTransaction(context.TODO(), func(sessCtx mongo.SessionContext) (interface{}, error) {
		// Use sessCtx as the Context parameter for InsertOne and FindOne so both operations are run in a
		// transaction.
		ctx := c.Copy()

		res, err := r.userSvc.GetAll(ctx)
		if err != nil {
			sessCtx.AbortTransaction(ctx)
			return nil, err
		}

		return res, err
	}, txnOpts)

	logrus.Debugf("%v", result)
	if err != nil {
		logrus.Fatal(err)
	}
}
func (r *Router) Create(c *gin.Context) {

}
func (r *Router) Exists(c *gin.Context)        {}
func (r *Router) Update(c *gin.Context)        {}
func (r *Router) GetGlobalByID(c *gin.Context) {}
func (r *Router) Delete(c *gin.Context)        {}

//func UsersRegistration(c *gin.Context) {
//	userModelValidator := NewUserModelValidator()
//	if err := userModelValidator.Bind(c); err != nil {
//		c.JSON(http.StatusUnprocessableEntity, common.NewValidatorError(err))
//		return
//	}
//
//	if err := SaveOne(&userModelValidator.userModel); err != nil {
//		c.JSON(http.StatusUnprocessableEntity, common.NewError("database", err))
//		return
//	}
//	c.Set("my_user_model", userModelValidator.userModel)
//	serializer := UserSerializer{c}
//	c.JSON(http.StatusCreated, gin.H{"user": serializer.Response()})
//}
//
//func UsersLogin(c *gin.Context) {
//	loginValidator := NewLoginValidator()
//	if err := loginValidator.Bind(c); err != nil {
//		c.JSON(http.StatusUnprocessableEntity, common.NewValidatorError(err))
//		return
//	}
//	userModel, err := FindOneUser(&UserModel{Email: loginValidator.userModel.Email})
//
//	if err != nil {
//		c.JSON(http.StatusForbidden, common.NewError("login", errors.New("Not Registered email or invalid password")))
//		return
//	}
//
//	if userModel.checkPassword(loginValidator.User.Password) != nil {
//		c.JSON(http.StatusForbidden, common.NewError("login", errors.New("Not Registered email or invalid password")))
//		return
//	}
//	UpdateContextUserModel(c, userModel.ID)
//	serializer := UserSerializer{c}
//	c.JSON(http.StatusOK, gin.H{"user": serializer.Response()})
//}
//
//func UserRetrieve(c *gin.Context) {
//	serializer := UserSerializer{c}
//	c.JSON(http.StatusOK, gin.H{"user": serializer.Response()})
//}
//
//func UserUpdate(c *gin.Context) {
//	myUserModel := c.MustGet("my_user_model").(UserModel)
//	userModelValidator := NewUserModelValidatorFillWith(myUserModel)
//	if err := userModelValidator.Bind(c); err != nil {
//		c.JSON(http.StatusUnprocessableEntity, common.NewValidatorError(err))
//		return
//	}
//
//	userModelValidator.userModel.ID = myUserModel.ID
//	if err := myUserModel.Update(userModelValidator.userModel); err != nil {
//		c.JSON(http.StatusUnprocessableEntity, common.NewError("database", err))
//		return
//	}
//	UpdateContextUserModel(c, myUserModel.ID)
//	serializer := UserSerializer{c}
//	c.JSON(http.StatusOK, gin.H{"user": serializer.Response()})
//}
