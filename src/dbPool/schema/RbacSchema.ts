import { Schema } from 'mongoose'

/**
 * KIRAKIRA RBAC
 * 
 * KIRAKIRA RBAC atomic permission control's smallest unit is API path.
 * * A user can have multiple roles
 * * A role can correspond to multiple users
 * * A role can have access permissions to multiple APIs
 * * An API can correspond to multiple roles
 */

/**
 * API path list
 * KIRAKIRA RBAC atomic permission control's smallest unit, which precisely controls access permissions for each API interface
 */
class RbacApiSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** API path UUID - non-null - unique */
		apiPathUuid: { type: String, required: true, unique: true },
		/** API path - non-null - unique */
		apiPath: { type: String, required: true, unique: true },
		/** API path type */
		apiPathType: { type: String },
		/** API path color */
		apiPathColor: { type: String },
		/** API path description */
		apiPathDescription: { type: String },
		/** API path creator - non-null */
		creatorUuid: { type: String, required: true },
		/** API path last updater - non-null */
		lastEditorUuid: { type: String, required: true },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'rbac-api-list'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const RbacApiSchema = new RbacApiSchemaFactory()

/**
 * RBAC Role
 * 
 * A user can have multiple roles
 * A role can correspond to multiple users
 * A role can have access permissions to multiple APIs
 * An API can correspond to multiple roles
 */
class RbacRoleSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Role UUID */
		roleUuid: { type: String, required: true, unique: true },
		/** Role name */
		roleName: { type: String, required: true, unique: true },
		/** Role type */
		roleType: { type: String },
		/** Role color */
		roleColor: { type: String },
		/** Role description */
		roleDescription: { type: String },
		/** Which API path access permissions this role has */
		apiPathPermissions: { type: [String], required: true },
		/** API path creator - non-null */
		creatorUuid: { type: String, required: true },
		/** API path last updater - non-null */
		lastEditorUuid: { type: String, required: true },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'rbac-role'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const RbacRoleSchema = new RbacRoleSchemaFactory()
